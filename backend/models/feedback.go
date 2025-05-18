package models

import (
	"time"

	"github.com/google/uuid"
)

// Обратная связь представляет собой отзыв пользователя о сеансе
type Feedback struct {
	ID        uuid.UUID `json:"id" db:"id"`
	SessionID uuid.UUID `json:"session_id" db:"session_id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	Rating    int       `json:"rating" db:"rating"`
	Comment   string    `json:"comment" db:"comment"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// FeedbackRequest для создания/обновления обратной связи
type FeedbackRequest struct {
	Rating  int    `json:"rating" binding:"required,min=1,max=5"`
	Comment string `json:"comment"`
}
