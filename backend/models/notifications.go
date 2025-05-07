package models

import (
	"time"
	"github.com/google/uuid"
)

type NotificationType string

const (
    NotificationTypeNewParticipant NotificationType = "new_participant"
    NotificationTypeSessionReminder NotificationType = "session_reminder"
    NotificationTypeSessionUpdate  NotificationType = "session_update" // Если сессия изменена
)

// Notification представляет уведомление для пользователя
type Notification struct {
	ID        uuid.UUID        `json:"id" db:"id"`
	UserID    uuid.UUID        `json:"user_id" db:"user_id"` // Кому уведомление
	Message   string           `json:"message" db:"message"`
	Type      NotificationType `json:"type" db:"type"`
	IsRead    bool             `json:"is_read" db:"is_read"`
	CreatedAt time.Time        `json:"created_at" db:"created_at"`
    RelatedID *uuid.UUID       `json:"related_id,omitempty" db:"related_id"`
    RelatedType string        `json:"related_type,omitempty" db:"related_type"`
}
