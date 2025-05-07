package controllers

import (
	"net/http"

	"github.com/BuzzLyutic/Skill-sharing-web-platform/repositories"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type NotificationController struct {
	repo *repositories.NotificationRepository
    // userRepo *repositories.UserRepository // Может понадобиться для получения имени пользователя
}

func NewNotificationController(repo *repositories.NotificationRepository) *NotificationController {
	return &NotificationController{repo: repo}
}

// GetMyUnreadNotifications обрабатывает GET /api/notifications/unread
func (c *NotificationController) GetMyUnreadNotifications(ctx *gin.Context) {
	userID, ok := getUserIDFromContext(ctx) // Используем вспомогательную функцию
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	limit := 10 // По умолчанию

	notifications, err := c.repo.GetUnreadNotificationsForUser(ctx.Request.Context(), userID, limit)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get notifications"})
		return
	}
	ctx.JSON(http.StatusOK, notifications)
}

// MarkAsRead обрабатывает POST /api/notifications/:notification_id/read
func (c *NotificationController) MarkAsRead(ctx *gin.Context) {
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	notificationIDStr := ctx.Param("notification_id")
	notificationID, err := uuid.Parse(notificationIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}

	err = c.repo.MarkNotificationAsRead(ctx.Request.Context(), notificationID, userID)
	if err != nil {
        if err.Error() == "notification not found or permission denied" {
             ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
        } else {
		    ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notification as read"})
        }
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}

// MarkAllAsRead обрабатывает POST /api/notifications/read-all
func (c *NotificationController) MarkAllAsRead(ctx *gin.Context) {
    userID, ok := getUserIDFromContext(ctx)
    if !ok {
        ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }

    _, err := c.repo.MarkAllNotificationsAsRead(ctx.Request.Context(), userID)
    if err != nil {
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark all notifications as read"})
        return
    }
    ctx.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
}
