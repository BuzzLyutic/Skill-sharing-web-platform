package repositories

import (
	"github.com/BuzzLyutic/Skill-sharing-web-platform/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// Определим кастомные ошибки для лучшей обработки в контроллере
var (
	ErrSessionNotFound      = errors.New("session not found")
	ErrAlreadyJoined        = errors.New("user already joined this session")
	ErrNotJoined            = errors.New("user is not a participant in this session")
	ErrSessionFull          = errors.New("session is full")
	ErrUpdateConflict       = errors.New("update conflict detected") // Если понадобится оптимистичная блокировка
	ErrDatabase             = errors.New("database error")          // Общая ошибка БД
	ErrForbidden            = errors.New("operation forbidden")     // Для случаев авторизации на уровне репо (хотя лучше в сервисе/контроллере)
	ErrParticipantNotFound = errors.New("participant not found for this session")
)


// SessionRepository handles database operations for sessions
type SessionRepository struct {
	db *sqlx.DB
}

// NewSessionRepository creates a new session repository
func NewSessionRepository(db *sqlx.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

// GetAll retrieves all sessions (Рассмотрите пагинацию для больших списков)
func (r *SessionRepository) GetAll(ctx context.Context) ([]models.Session, error) {
	sessions := []models.Session{}
	// Добавляем ORDER BY для предсказуемого порядка
	query := `SELECT * FROM sessions ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &sessions, query) // Используем SelectContext
	if err != nil {
		// Можно добавить логирование здесь
		// log.Printf("Error fetching all sessions: %v", err)
		return nil, fmt.Errorf("%w: failed to get all sessions: %v", ErrDatabase, err)
	}
	return sessions, nil
}

// GetByID retrieves a session by ID
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

// Create creates a new session
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
		// Можно проверить на specific postgres errors (e.g., unique constraint violation)
		return nil, fmt.Errorf("%w: failed to create session: %v", ErrDatabase, err)
	}
	return &createdSession, nil
}

// Update updates an existing session
// Важно: Этот метод НЕ проверяет, является ли пользователь создателем сессии.
// Эту проверку лучше делать в контроллере или сервисном слое.
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

// Delete deletes a session
// Важно: Этот метод НЕ проверяет, является ли пользователь создателем сессии.
// Эту проверку лучше делать в контроллере или сервисном слое.
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

// GetParticipants gets all participants of a session
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
		// Ошибка sql.ErrNoRows здесь нормальна (нет участников), не возвращаем ошибку
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
// Важно: Не проверяет max_participants или является ли пользователь создателем. Эти проверки должны быть в контроллере/сервисе.
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
		// Здесь можно проверять специфичные ошибки БД, например, нарушение foreign key (если сессия или юзер удалены)
		// или unique constraint (если проверка выше не сработала из-за гонки состояний, хотя она маловероятна)
		// log.Printf("Error joining session %s for user %s: %v", sessionID, userID, err)
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
