package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"log"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/models"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/repositories"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Вспомогательная функция из SessionController (если она не в общем пакете)
// func getUserIDFromContext(ctx *gin.Context) (uuid.UUID, bool) { ... }

type FeedbackController struct {
	repo        *repositories.FeedbackRepository
	sessionRepo *repositories.SessionRepository // <-- Добавляем репозиторий сессий для проверок
}

// NewFeedbackController создает новый контроллер обратной связи
// Теперь принимает оба репозитория
func NewFeedbackController(repo *repositories.FeedbackRepository, sessionRepo *repositories.SessionRepository) *FeedbackController {
	return &FeedbackController{
		repo:        repo,
		sessionRepo: sessionRepo,
	}
}

// CreateFeedback обрабатывает POST /sessions/:id/feedback
func (c *FeedbackController) CreateFeedback(ctx *gin.Context) {
	// 1. Получаем ID сессии из URL
	sessionIDStr := ctx.Param("id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID format"})
		return
	}

	// 2. Получаем ID пользователя из контекста (установлен JWT middleware)
	userID, ok := getUserIDFromContext(ctx) // Используем вспомогательную функцию
	if !ok {
		// Ошибка уже залогирована в getUserIDFromContext
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User identification failed"})
		return
	}

	// 3. Биндим и валидируем тело запроса
	var req models.FeedbackRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		log.Printf("Failed to bind JSON for feedback creation on session %s by user %s: %v", sessionID, userID, err)
		// Возвращаем детали валидации, если они полезны (например, неверный диапазон рейтинга)
        // Можно использовать errors.As для проверки validator.ValidationErrors
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

    requestContext := ctx.Request.Context() // Получаем стандартный контекст

	// --- ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ ПЕРЕД СОЗДАНИЕМ ОТЗЫВА ---

	// 4. Проверяем, существует ли сессия
	session, err := c.sessionRepo.GetByID(requestContext, sessionID)
	if err != nil {
		if errors.Is(err, repositories.ErrSessionNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Session with ID %s not found", sessionID)})
		} else {
			log.Printf("ERROR checking session %s existence for feedback by user %s: %v", sessionID, userID, err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify session"})
		}
		return
	}

    // 5. Проверяем, не является ли пользователь создателем сессии
    if session.CreatorID == userID {
        log.Printf("WARN: Creator %s attempted to leave feedback on their own session %s", userID, sessionID)
        ctx.JSON(http.StatusForbidden, gin.H{"error": "You cannot leave feedback on your own session"})
        return
    }

	// 6. Проверяем, был ли пользователь участником сессии
    // (Предполагаем, что метод IsParticipant добавлен в SessionRepository)
	isParticipant, err := c.sessionRepo.IsParticipant(requestContext, sessionID, userID)
	if err != nil {
        log.Printf("ERROR checking participation for user %s in session %s: %v", userID, sessionID, err)
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify participation status"})
		return
	}
	if !isParticipant {
        log.Printf("WARN: Non-participant user %s attempted to leave feedback on session %s", userID, sessionID)
		ctx.JSON(http.StatusForbidden, gin.H{"error": "You must be a participant to leave feedback"})
		return
	}

    // 7. (Опционально) Проверяем, завершилась ли сессия
    // if session.DateTime.After(time.Now()) {
    //     ctx.JSON(http.StatusBadRequest, gin.H{"error": "You can only leave feedback after the session has ended"})
    //     return
    // }

    // --- КОНЕЦ ДОПОЛНИТЕЛЬНЫХ ПРОВЕРОК ---


	// 8. Создаем отзыв в репозитории (передаем контекст!)
	// Репозиторий сам проверит на дубликат (ErrFeedbackAlreadyExists)
	feedback, err := c.repo.CreateFeedback(requestContext, req, sessionID, userID)
	if err != nil {
		if errors.Is(err, repositories.ErrFeedbackAlreadyExists) {
			ctx.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		} else if errors.Is(err, repositories.ErrDatabase) {
            // Ошибки типа foreign key constraint или другие проблемы БД
			log.Printf("ERROR creating feedback in repository for session %s by user %s: %v", sessionID, userID, err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save feedback due to a database issue"})
		} else {
            // Непредвиденные ошибки
             log.Printf("UNEXPECTED ERROR creating feedback for session %s by user %s: %v", sessionID, userID, err)
             ctx.JSON(http.StatusInternalServerError, gin.H{"error": "An unexpected error occurred while saving feedback"})
        }
		return
	}

	// 9. Возвращаем успешный ответ
	ctx.JSON(http.StatusCreated, feedback)
}

// GetFeedback обрабатывает GET /sessions/:id/feedback
func (c *FeedbackController) GetFeedback(ctx *gin.Context) {
	sessionIDStr := ctx.Param("id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID format"})
		return
	}

    // (Опционально) Проверить, существует ли сессия перед получением отзывов
    // _, err = c.sessionRepo.GetByID(ctx.Request.Context(), sessionID)
    // if err != nil { ... }

	// Получаем отзывы (передаем контекст!)
	feedbacks, err := c.repo.GetFeedbackBySession(ctx.Request.Context(), sessionID)
	if err != nil {
        // Ошибку ErrDatabase уже залогировал репозиторий
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve feedback"})
		return
	}

    // feedbacks гарантированно не nil из-за изменений в репозитории

	ctx.JSON(http.StatusOK, feedbacks)
}
