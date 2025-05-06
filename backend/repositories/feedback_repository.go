package repositories

import (
	"errors"
	"context"
	"log"
	"fmt"
	"database/sql"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)


// Определим специфичные ошибки для обратной связи
var (
	ErrFeedbackNotFound      = errors.New("feedback not found")
	ErrFeedbackAlreadyExists = errors.New("user has already submitted feedback for this session")
)

type FeedbackRepository struct {
	db *sqlx.DB
}

func NewFeedbackRepository(db *sqlx.DB) *FeedbackRepository {
	return &FeedbackRepository{db: db}
}

// CreateFeedback создает новую запись обратной связи
// Возвращает указатель на созданную модель
func (r *FeedbackRepository) CreateFeedback(ctx context.Context, req models.FeedbackRequest, sessionID, userID uuid.UUID) (*models.Feedback, error) {
	var fb models.Feedback
	query := `
        INSERT INTO feedback (session_id, user_id, rating, comment)
        VALUES ($1, $2, $3, $4)
        RETURNING id, session_id, user_id, rating, comment, created_at
    `
	// Используем GetContext
	err := r.db.GetContext(ctx, &fb, query, sessionID, userID, req.Rating, req.Comment)
	if err != nil {
		// Проверяем на ошибку уникальности (если пользователь уже оставил отзыв)
		// Код '23505' - это стандартный код ошибки unique_violation в PostgreSQL
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			log.Printf("INFO: Attempted duplicate feedback for session %s by user %s", sessionID, userID)
			return nil, ErrFeedbackAlreadyExists
		}

		// Проверяем на ошибку внешнего ключа (если сессия или пользователь не существуют)
		// Код '23503' - foreign_key_violation
		if errors.As(err, &pqErr) && pqErr.Code == "23503" {
			log.Printf("WARN: Attempted feedback for non-existent session %s or user %s", sessionID, userID)
			// Можно вернуть более конкретную ошибку, но для простоты вернем общую ошибку БД
            // или даже ErrSessionNotFound/ErrUserNotFound, если есть доступ к UserRepo
            return nil, fmt.Errorf("%w: foreign key constraint violation (%s)", ErrDatabase, pqErr.Constraint)
		}

		log.Printf("ERROR creating feedback for session %s by user %s: %v", sessionID, userID, err)
		return nil, fmt.Errorf("%w: failed to create feedback: %v", ErrDatabase, err)
	}
	return &fb, nil
}

// GetFeedbackBySession получает все отзывы для конкретной сессии
// Возвращает слайс моделей (не указателей)
func (r *FeedbackRepository) GetFeedbackBySession(ctx context.Context, sessionID uuid.UUID) ([]models.Feedback, error) {
	var feedbacks []models.Feedback
	// Явно указываем поля, избегая SELECT *
	query := `
		SELECT id, session_id, user_id, rating, comment, created_at
		FROM feedback
		WHERE session_id = $1
		ORDER BY created_at DESC`
	// Используем SelectContext
	err := r.db.SelectContext(ctx, &feedbacks, query, sessionID)
	if err != nil {
		// sql.ErrNoRows не является ошибкой для Select, он вернет пустой слайс.
		// Логируем только "настоящие" ошибки БД.
        if !errors.Is(err, sql.ErrNoRows) {
		    log.Printf("ERROR fetching feedback for session %s: %v", sessionID, err)
            return nil, fmt.Errorf("%w: failed to get feedback by session %s: %v", ErrDatabase, sessionID, err)
        }
		// Если была ошибка sql.ErrNoRows или нет ошибок, вернется пустой (но не nil) слайс feedbacks
	}
    // Гарантируем возврат [] вместо nil, если записей нет
    if feedbacks == nil {
        feedbacks = []models.Feedback{}
    }
	return feedbacks, nil
}

// GetFeedbackByUserAndSession проверяет, оставлял ли пользователь отзыв на сессию
// Можно использовать для проверки перед CreateFeedback в контроллере,
// хотя проверка в CreateFeedback через обработку unique constraint надежнее (атомарно).
func (r *FeedbackRepository) GetFeedbackByUserAndSession(ctx context.Context, sessionID, userID uuid.UUID) (*models.Feedback, error) {
    var fb models.Feedback
    query := `
        SELECT id, session_id, user_id, rating, comment, created_at
        FROM feedback
        WHERE session_id = $1 AND user_id = $2`
    err := r.db.GetContext(ctx, &fb, query, sessionID, userID)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, ErrFeedbackNotFound // Отзыв не найден - это не ошибка БД
        }
        log.Printf("ERROR checking feedback for session %s by user %s: %v", sessionID, userID, err)
        return nil, fmt.Errorf("%w: failed to check feedback: %v", ErrDatabase, err)
    }
    return &fb, nil
}
