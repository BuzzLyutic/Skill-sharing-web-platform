package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/BuzzLyutic/Skill-sharing-web-platform/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

// Определим кастомные ошибки для лучшей обработки в контроллере
var (
	ErrSessionNotFound      = errors.New("session not found")
	ErrAlreadyJoined        = errors.New("user already joined this session")
	ErrNotJoined            = errors.New("user is not a participant in this session")
	ErrSessionFull          = errors.New("session is full")
	ErrUpdateConflict       = errors.New("update conflict detected") // Если понадобится оптимистичная блокировка
	ErrDatabase             = errors.New("database error")          // Общая ошибка БД
	ErrForbidden            = errors.New("operation forbidden")
	ErrParticipantNotFound = errors.New("participant not found for this session")
)


// SessionRepository обрабатывает операции с базой данных для сеансов
type SessionRepository struct {
	db *sqlx.DB
}

// NewSessionRepository создает новый репозиторий сеансов
func NewSessionRepository(db *sqlx.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

// GetAll извлекает все сеансы
func (r *SessionRepository) GetAll(ctx context.Context) ([]models.Session, error) {
	sessions := []models.Session{}
	// Добавляем ORDER BY для предсказуемого порядка
	query := `SELECT * FROM sessions ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &sessions, query) // Используем SelectContext
	if err != nil {
		return nil, fmt.Errorf("%w: failed to get all sessions: %v", ErrDatabase, err)
	}
	return sessions, nil
}

// GetByID извлекает сеанс по идентификатору
func (r *SessionRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Session, error) {
	var session models.Session
	query := `SELECT * FROM sessions WHERE id = $1`
	err := r.db.GetContext(ctx, &session, query, id) // Используем GetContext
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSessionNotFound // Возвращаем кастомную ошибку
		}
		// log.Printf("Error fetching session by ID %s: %v", id, err)
		return nil, fmt.Errorf("%w: failed to get session by id %s: %v", ErrDatabase, id, err)
	}
	return &session, nil
}

// Create создает новый сеанс
func (r *SessionRepository) Create(ctx context.Context, creatorID uuid.UUID, req models.SessionRequest) (*models.Session, error) {
	var createdSession models.Session
	query := `
        INSERT INTO sessions (title, description, category, date_time, location, max_participants, creator_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`
	err := r.db.GetContext(ctx, &createdSession, query, // Используем GetContext
		req.Title,
		req.Description,
		req.Category,
		req.DateTime,
		req.Location,
		req.MaxParticipants,
		creatorID, // ID создателя теперь последний аргумент
	)
	if err != nil {
		// log.Printf("Error creating session for user %s: %v", creatorID, err)
		return nil, fmt.Errorf("%w: failed to create session: %v", ErrDatabase, err)
	}
	return &createdSession, nil
}

// Update обновляет существующий сеанс
func (r *SessionRepository) Update(ctx context.Context, id uuid.UUID, req models.SessionRequest) (*models.Session, error) {
	var updatedSession models.Session
	query := `
        UPDATE sessions
        SET title = $2, description = $3, category = $4, date_time = $5, location = $6, max_participants = $7, updated_at = NOW()
        WHERE id = $1
        RETURNING *`
	err := r.db.GetContext(ctx, &updatedSession, query, // Используем GetContext
		id, // id теперь $1
		req.Title,
		req.Description,
		req.Category,
		req.DateTime,
		req.Location,
		req.MaxParticipants,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// Если сессия не найдена для обновления
			return nil, ErrSessionNotFound
		}
		// log.Printf("Error updating session %s: %v", id, err)
		return nil, fmt.Errorf("%w: failed to update session %s: %v", ErrDatabase, id, err)
	}
	return &updatedSession, nil
}

// Delete удаляет сеанс
func (r *SessionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM sessions WHERE id = $1`
	result, err := r.db.ExecContext(ctx, query, id) // Используем ExecContext
	if err != nil {
		// log.Printf("Error deleting session %s: %v", id, err)
		return fmt.Errorf("%w: failed to delete session %s: %v", ErrDatabase, id, err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		// log.Printf("Error getting rows affected after deleting session %s: %v", id, err)
		return fmt.Errorf("%w: failed to check rows affected for session %s: %v", ErrDatabase, id, err)
	}

	if rowsAffected == 0 {
		return ErrSessionNotFound // Сессия не найдена для удаления
	}

	return nil
}

// GetParticipants получает доступ ко всем участникам сеанса
func (r *SessionRepository) GetParticipants(ctx context.Context, sessionID uuid.UUID) ([]models.User, error) {
	users := []models.User{}
	// Выбираем нужные поля пользователя, избегаем SELECT *
	// Исключаем хеш пароля и рефреш токен
	query := `
        SELECT u.id, u.email, u.name, u.bio, u.skills, u.average_rating, u.created_at, u.updated_at, u.role, u.oauth_provider, u.oauth_id
        FROM users u
        JOIN session_participants sp ON u.id = sp.user_id
        WHERE sp.session_id = $1`
	err := r.db.SelectContext(ctx, &users, query, sessionID) // Используем SelectContext
	if err != nil {
		// log.Printf("Error fetching participants for session %s: %v", sessionID, err)
		if errors.Is(err, sql.ErrNoRows) {
			return users, nil // Возвращаем пустой слайс
		}
		return nil, fmt.Errorf("%w: failed to get participants for session %s: %v", ErrDatabase, sessionID, err)
	}
	return users, nil
}

// CountParticipants возвращает текущее количество участников сессии
func (r *SessionRepository) CountParticipants(ctx context.Context, sessionID uuid.UUID) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM session_participants WHERE session_id = $1`
	err := r.db.GetContext(ctx, &count, query, sessionID)
	if err != nil {
		// Ошибка sql.ErrNoRows здесь не ожидается для COUNT(*), но обработаем на всякий случай
		if errors.Is(err, sql.ErrNoRows) {
			return 0, nil
		}
		// log.Printf("Error counting participants for session %s: %v", sessionID, err)
		return 0, fmt.Errorf("%w: failed to count participants for session %s: %v", ErrDatabase, sessionID, err)
	}
	return count, nil
}

// IsParticipant проверяет, является ли пользователь участником сессии
func (r *SessionRepository) IsParticipant(ctx context.Context, sessionID, userID uuid.UUID) (bool, error) {
	var exists bool
	query := `SELECT EXISTS (SELECT 1 FROM session_participants WHERE session_id = $1 AND user_id = $2)`
	err := r.db.GetContext(ctx, &exists, query, sessionID, userID)
	if err != nil {
		// log.Printf("Error checking participant status for user %s in session %s: %v", userID, sessionID, err)
		return false, fmt.Errorf("%w: failed to check participant status: %v", ErrDatabase, err)
	}
	return exists, nil
}


// JoinSession добавляет пользователя в сессию (вставляет запись в session_participants)
func (r *SessionRepository) JoinSession(ctx context.Context, sessionID, userID uuid.UUID) error {
    // Проверка, не является ли пользователь уже участником
    isAlreadyParticipant, err := r.IsParticipant(ctx, sessionID, userID)
    if err != nil {
        return err // Ошибка уже обернута в IsParticipant
    }
    if isAlreadyParticipant {
        return ErrAlreadyJoined
    }

	query := `INSERT INTO session_participants (session_id, user_id) VALUES ($1, $2)`
	_, err = r.db.ExecContext(ctx, query, sessionID, userID) // Используем ExecContext
	if err != nil {
		return fmt.Errorf("%w: failed to join session: %v", ErrDatabase, err)
	}
	return nil
}

// LeaveSession удаляет пользователя из сессии (удаляет запись из session_participants)
func (r *SessionRepository) LeaveSession(ctx context.Context, sessionID, userID uuid.UUID) error {
	query := `DELETE FROM session_participants WHERE session_id = $1 AND user_id = $2`
	result, err := r.db.ExecContext(ctx, query, sessionID, userID) // Используем ExecContext
	if err != nil {
		// log.Printf("Error leaving session %s for user %s: %v", sessionID, userID, err)
		return fmt.Errorf("%w: failed to leave session: %v", ErrDatabase, err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		// log.Printf("Error getting rows affected after leaving session %s for user %s: %v", sessionID, userID, err)
		return fmt.Errorf("%w: failed to check rows affected for leave session: %v", ErrDatabase, err)
	}

	if rowsAffected == 0 {
		// Пользователь не был найден в этой сессии для удаления
		return ErrNotJoined // Возвращаем кастомную ошибку
	}

	return nil
}


// GetRecommendedSessionsForUser получает рекомендуемые сессии для конкретного пользователя
// limit - максимальное количество рекомендуемых сессий
func (r *SessionRepository) GetRecommendedSessionsForUser(ctx context.Context, userID uuid.UUID, userSkills []string, limit int) ([]models.Session, error) {
	sessions := []models.Session{}
	var query string
	var args []interface{}

	// Логика рекомендаций:
	// 1. Если у пользователя есть навыки, ищем сессии по этим навыкам (категориям)
	// 2. Если нет, можно искать по категориям сессий, в которых он участвовал (более сложный запрос)
	// 3. Или сессии от пользователей с высоким рейтингом
	// Для MVP упростим: сначала по навыкам, если нет, то просто популярные/новые.

	if len(userSkills) > 0 {
		// Ищем сессии, где категория совпадает с одним из навыков пользователя
		// Исключаем сессии, созданные самим пользователем и те, к которым он уже присоединился
        // Исключаем прошедшие сессии
		query = `
			SELECT s.* FROM sessions s
			LEFT JOIN session_participants sp ON s.id = sp.session_id AND sp.user_id = $1
			WHERE s.category = ANY($2)
			  AND s.creator_id != $1
			  AND sp.session_id IS NULL
              AND s.date_time > NOW()
			ORDER BY s.date_time ASC
			LIMIT $3`
		args = append(args, userID, pq.Array(userSkills), limit)
	} else {
		// Если у пользователя нет навыков, рекомендуем просто новые или популярные сессии,
		// к которым он не присоединился и которые он не создавал.
        // Исключаем прошедшие сессии
		query = `
			SELECT s.* FROM sessions s
			LEFT JOIN session_participants sp ON s.id = sp.session_id AND sp.user_id = $1
			WHERE s.creator_id != $1
			  AND sp.session_id IS NULL
              AND s.date_time > NOW()
			ORDER BY s.created_at DESC, s.date_time ASC
			LIMIT $2`
		args = append(args, userID, limit)
	}

	err := r.db.SelectContext(ctx, &sessions, query, args...)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		log.Printf("ERROR getting recommended sessions for user %s: %v", userID, err)
		return nil, fmt.Errorf("%w: failed to get recommended sessions: %v", ErrDatabase, err)
	}
	if sessions == nil {
		sessions = []models.Session{}
	}
	return sessions, nil
}

// GetGeneralRecommendedSessions получает общерекомендуемые сессии (для неавторизованных или как fallback)
func (r *SessionRepository) GetGeneralRecommendedSessions(ctx context.Context, limit int) ([]models.Session, error) {
	sessions := []models.Session{}
	// Рекомендуем новые или скоро начинающиеся сессии
    // Исключаем прошедшие сессии
	query := `
		SELECT * FROM sessions
        WHERE date_time > NOW()
		ORDER BY date_time ASC, created_at DESC
		LIMIT $1`
	err := r.db.SelectContext(ctx, &sessions, query, limit)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		log.Printf("ERROR getting general recommended sessions: %v", err)
		return nil, fmt.Errorf("%w: failed to get general recommended sessions: %v", ErrDatabase, err)
	}
	if sessions == nil {
		sessions = []models.Session{}
	}
	return sessions, nil
}


// GetSessionsStartingSoon получает сессии, начинающиеся до указанного времени
func (r *SessionRepository) GetSessionsStartingSoon(ctx context.Context, beforeTime time.Time) ([]models.Session, error) {
    sessions := []models.Session{}
    query := `
        SELECT * FROM sessions
        WHERE date_time > NOW() AND date_time <= $1
        ORDER BY date_time ASC`
    err := r.db.SelectContext(ctx, &sessions, query, beforeTime)
    if err != nil && !errors.Is(err, sql.ErrNoRows) {
        log.Printf("ERROR getting sessions starting soon (before %v): %v", beforeTime, err)
        return nil, fmt.Errorf("%w: failed to get sessions starting soon: %v", ErrDatabase, err)
    }
    if sessions == nil {
        sessions = []models.Session{}
    }
    return sessions, nil
}


// SearchSessions выполняет поиск и фильтрацию сессий
func (r *SessionRepository) SearchSessions(ctx context.Context, filters models.SessionSearchFilters) ([]models.Session, int, error) { // Возвращаем также общее количество
    var sessions []models.Session
    var totalCount int

    // Базовый запрос
    baseQuery := `
        SELECT s.id, s.title, s.description, s.category, s.date_time, s.location, s.max_participants, s.creator_id, s.created_at, s.updated_at
        -- Дополнительные поля, если нужны (например, количество участников, средний рейтинг сессии)
        -- , COUNT(sp.user_id) as participant_count
        -- , COALESCE(AVG(f.rating), 0) as average_session_rating
        FROM sessions s
        -- LEFT JOIN session_participants sp ON s.id = sp.session_id -- Если нужен participant_count
        -- LEFT JOIN feedback f ON s.id = f.session_id             -- Если нужен average_session_rating
    `
    countQuery := `SELECT COUNT(DISTINCT s.id) FROM sessions s` // Для подсчета общего количества

    var whereClauses []string
    var args []interface{}
    argID := 1

    if filters.CreatorID != nil && *filters.CreatorID != uuid.Nil {
        whereClauses = append(whereClauses, fmt.Sprintf("s.creator_id = $%d", argID))
        args = append(args, *filters.CreatorID)
        argID++
        log.Printf("SearchSessions: Filtering by CreatorID: %s", (*filters.CreatorID).String())
    }

    if filters.Query != "" {
        // Поиск по названию и описанию
        queryWords := strings.Fields(filters.Query)
        for _, word := range queryWords {
             whereClauses = append(whereClauses, fmt.Sprintf("(s.title ILIKE $%d OR s.description ILIKE $%d)", argID, argID+1))
             args = append(args, "%"+word+"%", "%"+word+"%")
             argID += 2
        }
    }
    if filters.Category != "" {
        whereClauses = append(whereClauses, fmt.Sprintf("s.category = $%d", argID))
        args = append(args, filters.Category)
        argID++
    }

    if filters.DateFrom != nil {
        whereClauses = append(whereClauses, fmt.Sprintf("s.date_time >= $%d", argID))
        args = append(args, *filters.DateFrom)
        argID++
    }
    if filters.DateTo != nil {
        whereClauses = append(whereClauses, fmt.Sprintf("s.date_time <= $%d", argID))
        args = append(args, *filters.DateTo)
        argID++
    }
     if filters.ExcludePast { // По умолчанию true
         whereClauses = append(whereClauses, "s.date_time > NOW()")
     }

    // Сборка WHERE
    whereSQL := ""
    if len(whereClauses) > 0 {
        whereSQL = " WHERE " + strings.Join(whereClauses, " AND ")
    }

    finalQuery := baseQuery + whereSQL
    // finalQuery += " GROUP BY s.id" 
    finalQuery += " ORDER BY s.date_time ASC" // Или другой порядок

    // Добавляем пагинацию к args для основного запроса
    var pagedArgs []interface{}
    pagedArgs = append(pagedArgs, args...) // Копируем аргументы для WHERE
    if filters.Limit > 0 {
        finalQuery += fmt.Sprintf(" LIMIT $%d", argID)
        pagedArgs = append(pagedArgs, filters.Limit)
        argID++
    }
    if filters.Offset > 0 {
        finalQuery += fmt.Sprintf(" OFFSET $%d", argID)
        pagedArgs = append(pagedArgs, filters.Offset)
        argID++
    }


    // Выполнение запросов
    // 1. Получение общего количества записей (для пагинации на клиенте)
    err := r.db.GetContext(ctx, &totalCount, countQuery+whereSQL, args...) // Используем args без пагинации
    if err != nil && !errors.Is(err, sql.ErrNoRows) {
        log.Printf("ERROR counting sessions with filters: %v, query: %s, args: %v", err, countQuery+whereSQL, args)
        return nil, 0, fmt.Errorf("%w: failed to count sessions: %v", ErrDatabase, err)
    }
    if errors.Is(err, sql.ErrNoRows) { // Если sql.ErrNoRows для COUNT, то totalCount будет 0
         totalCount = 0
    }


    // 2. Получение самих сессий
    err = r.db.SelectContext(ctx, &sessions, finalQuery, pagedArgs...)
    if err != nil && !errors.Is(err, sql.ErrNoRows) {
        log.Printf("ERROR searching sessions: %v, query: %s, args: %v", err, finalQuery, pagedArgs)
        return nil, 0, fmt.Errorf("%w: failed to search sessions: %v", ErrDatabase, err)
    }

    if sessions == nil {
        sessions = []models.Session{}
    }
    return sessions, totalCount, nil
}


// GetJoinedSessionsByUserID извлекает все сеансы, к которым присоединился пользователь
func (r *SessionRepository) GetJoinedSessionsByUserID(ctx context.Context, userID uuid.UUID, filters models.SessionSearchFilters) ([]models.Session, int, error) {
    var sessions []models.Session
    var totalCount int

    baseQuery := `
        SELECT s.*
        FROM sessions s
        JOIN session_participants sp ON s.id = sp.session_id
    `
    countBaseQuery := `
        SELECT COUNT(DISTINCT s.id)
        FROM sessions s
        JOIN session_participants sp ON s.id = sp.session_id
    `
    conditions := []string{"sp.user_id = $1"}
    args := []interface{}{userID}
    argId := 2 // Start next arg index at 2

    if filters.Category != "" {
        conditions = append(conditions, fmt.Sprintf("s.category = $%d", argId))
        args = append(args, filters.Category)
        argId++
    }
    if filters.ExcludePast {
        conditions = append(conditions, fmt.Sprintf("s.date_time >= $%d", argId))
        args = append(args, time.Now()) 
        argId++
    }

    whereClause := ""
    if len(conditions) > 0 {
        whereClause = " WHERE " + strings.Join(conditions, " AND ")
    }

    finalCountQuery := countBaseQuery + whereClause
    err := r.db.GetContext(ctx, &totalCount, finalCountQuery, args...)
    if err != nil {
        log.Printf("Error counting joined sessions for user %s: %v", userID, err)
        return nil, 0, fmt.Errorf("%w: failed to count joined sessions: %v", ErrDatabase, err)
    }

    orderBy := " ORDER BY s.date_time DESC" // Or other preferred order
    limitOffset := fmt.Sprintf(" LIMIT $%d OFFSET $%d", argId, argId+1)
    args = append(args, filters.Limit, filters.Offset)

    finalQuery := baseQuery + whereClause + orderBy + limitOffset
    err = r.db.SelectContext(ctx, &sessions, finalQuery, args...)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return []models.Session{}, 0, nil // No sessions joined is not an error
        }
        log.Printf("Error fetching joined sessions for user %s: %v", userID, err)
        return nil, 0, fmt.Errorf("%w: failed to get joined sessions: %v", ErrDatabase, err)
    }
    return sessions, totalCount, nil
}
