package repositories

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/BuzzLyutic/Skill-sharing-web-platform/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type NotificationRepository struct {
	db *sqlx.DB
}

func NewNotificationRepository(db *sqlx.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

// CreateNotification создает новое уведомление
func (r *NotificationRepository) CreateNotification(ctx context.Context, notification models.Notification) (*models.Notification, error) {
	query := `
		INSERT INTO notifications (user_id, message, type, related_id, related_type)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, message, type, is_read, created_at, related_id, related_type`

	var createdNotification models.Notification
	err := r.db.GetContext(ctx, &createdNotification, query,
		notification.UserID, notification.Message, notification.Type, notification.RelatedID, notification.RelatedType)

	if err != nil {
		log.Printf("ERROR creating notification for user %s: %v", notification.UserID, err)
		return nil, fmt.Errorf("failed to create notification: %w", err)
	}
	return &createdNotification, nil
}

// GetUnreadNotificationsForUser получает непрочитанные уведомления для пользователя
func (r *NotificationRepository) GetUnreadNotificationsForUser(ctx context.Context, userID uuid.UUID, limit int) ([]models.Notification, error) {
	var notifications []models.Notification
	query := `
		SELECT * FROM notifications
		WHERE user_id = $1 AND is_read = FALSE
		ORDER BY created_at DESC
		LIMIT $2`
	err := r.db.SelectContext(ctx, &notifications, query, userID, limit)
	if err != nil {
		log.Printf("ERROR getting unread notifications for user %s: %v", userID, err)
		return nil, fmt.Errorf("failed to get notifications: %w", err)
	}
	if notifications == nil {
		notifications = []models.Notification{}
	}
	return notifications, nil
}

// MarkNotificationAsRead помечает уведомление как прочитанное
func (r *NotificationRepository) MarkNotificationAsRead(ctx context.Context, notificationID uuid.UUID, userID uuid.UUID) error {
	// userID нужен для проверки, что пользователь помечает свое уведомление
	query := `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`
	result, err := r.db.ExecContext(ctx, query, notificationID, userID)
	if err != nil {
		log.Printf("ERROR marking notification %s as read for user %s: %v", notificationID, userID, err)
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return errors.New("notification not found or permission denied") // Или ErrNotificationNotFound
	}
	return nil
}

// MarkAllNotificationsAsRead для пользователя
func (r *NotificationRepository) MarkAllNotificationsAsRead(ctx context.Context, userID uuid.UUID) (int64, error) {
    query := `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`
    result, err := r.db.ExecContext(ctx, query, userID)
    if err != nil {
        log.Printf("ERROR marking all notifications as read for user %s: %v", userID, err)
        return 0, fmt.Errorf("failed to mark all notifications as read: %w", err)
    }
    rowsAffected, _ := result.RowsAffected()
    return rowsAffected, nil
}
