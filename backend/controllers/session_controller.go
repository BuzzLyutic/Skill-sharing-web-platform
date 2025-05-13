package controllers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"
	"github.com/arran4/golang-ical"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/middleware"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/models"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/repositories"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// SessionController handles session-related HTTP requests
type SessionController struct {
	repo *repositories.SessionRepository
	userRepo *repositories.UserRepository
	notifRepo *repositories.NotificationRepository
}

// NewSessionController creates a new session controller
func NewSessionController(
	repo *repositories.SessionRepository,
	userRepo *repositories.UserRepository,
	notifRepo *repositories.NotificationRepository,
	) *SessionController {
	return &SessionController{repo: repo, notifRepo: notifRepo, userRepo: userRepo}
}

// getUserIDFromContext извлекает User ID из контекста Gin.
// Возвращает ID пользователя и true, если успешно, иначе пустой UUID и false.
func getUserIDFromContext(ctx *gin.Context) (uuid.UUID, bool) {
	userIDValue, exists := ctx.Get(middleware.ContextUserIDKey) // Используем константу
	if !exists {
		log.Printf("WARN: UserID missing from context for request %s", ctx.Request.URL.Path)
		return uuid.Nil, false
	}

	userID, ok := userIDValue.(uuid.UUID) // Утверждение типа
	if !ok {
		log.Printf("ERROR: UserID in context is not of type uuid.UUID for request %s. Actual type: %T", ctx.Request.URL.Path, userIDValue)
		return uuid.Nil, false
	}
    if userID == uuid.Nil {
        log.Printf("WARN: Nil UserID found in context for request %s", ctx.Request.URL.Path)
        return uuid.Nil, false // Невалидный ID
    }

    return userID, true
}


// GetAll (теперь с фильтрацией и пагинацией)
func (c *SessionController) GetAll(ctx *gin.Context) {
    var filters models.SessionSearchFilters // Используем тип из репозитория или models

    // Значения по умолчанию для пагинации
    filters.Limit = 10 // Например, 10 на страницу
    filters.Offset = 0
    filters.ExcludePast = true // По умолчанию не показывать прошедшие

    // Парсинг query параметров
    filters.Query = ctx.Query("q")
    filters.Category = ctx.Query("category")
    filters.Location = ctx.Query("location")

    if dateFromStr := ctx.Query("date_from"); dateFromStr != "" {
        if t, err := time.Parse(time.RFC3339, dateFromStr); err == nil { // Ожидаем ISO 8601
            filters.DateFrom = &t
        } else {
             log.Printf("WARN: Invalid date_from format: %s", dateFromStr)
        }
    }
    if dateToStr := ctx.Query("date_to"); dateToStr != "" {
        if t, err := time.Parse(time.RFC3339, dateToStr); err == nil {
            filters.DateTo = &t
        } else {
            log.Printf("WARN: Invalid date_to format: %s", dateToStr)
        }
    }
    if excludePastQuery := ctx.Query("exclude_past"); excludePastQuery != "" {
        if excludePastQuery == "false" {
            filters.ExcludePast = false
        }
    }

    if limitStr := ctx.Query("limit"); limitStr != "" {
        if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
            filters.Limit = l
        }
    }
    if pageStr := ctx.Query("page"); pageStr != "" { // Используем page для удобства клиента
        if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
            filters.Offset = (p - 1) * filters.Limit
        }
    }

    sessions, totalCount, err := c.repo.SearchSessions(ctx.Request.Context(), filters)
    if err != nil {
        // Ошибка уже залогирована в репозитории
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve sessions"})
        return
    }

    // Возвращаем данные и метаданные для пагинации
    ctx.JSON(http.StatusOK, gin.H{
        "data": sessions,
        "meta": gin.H{
            "total_items": totalCount,
            "per_page":    filters.Limit,
            "current_page": (filters.Offset / filters.Limit) + 1,
            "total_pages":  (totalCount + filters.Limit - 1) / filters.Limit, // Округление вверх
        },
    })
}


// GetByID handles GET /sessions/:id
func (c *SessionController) GetByID(ctx *gin.Context) {
	idStr := ctx.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID format"})
		return
	}

	// Передаем контекст запроса в репозиторий
	session, err := c.repo.GetByID(ctx.Request.Context(), id)
	if err != nil {
		if errors.Is(err, repositories.ErrSessionNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
            log.Printf("ERROR getting session by ID %s: %v", id, err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve session"})
		}
		return
	}

	ctx.JSON(http.StatusOK, session)
}

// Create handles POST /sessions
func (c *SessionController) Create(ctx *gin.Context) {
	var req models.SessionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		// Логируем детали ошибки для отладки, но не показываем их пользователю
        log.Printf("Failed to bind JSON for session creation: %v", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

    // Дополнительная валидация, если нужна (например, дата в будущем)
    // if req.DateTime.Before(time.Now()) {
    //     ctx.JSON(http.StatusBadRequest, gin.H{"error": "Session date must be in the future"})
    //     return
    // }

	creatorID, ok := getUserIDFromContext(ctx)
	if !ok {
        // getUserIDFromContext уже залогировала проблему
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User identification failed"})
		return
	}

	// Передаем контекст запроса в репозиторий
	session, err := c.repo.Create(ctx.Request.Context(), creatorID, req)
	if err != nil {
		log.Printf("ERROR creating session for user %s: %v", creatorID, err)
        // Можно добавить обработку специфичных ошибок репозитория, если нужно
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	ctx.JSON(http.StatusCreated, session)
}

// Update handles PUT /sessions/:id
func (c *SessionController) Update(ctx *gin.Context) {
	sessionIDStr := ctx.Param("id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID format"})
		return
	}

	var req models.SessionRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
        log.Printf("Failed to bind JSON for session update %s: %v", sessionID, err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User identification failed"})
		return
	}

	// --- Авторизация: Проверяем, что пользователь - создатель сессии ---
	existingSession, err := c.repo.GetByID(ctx.Request.Context(), sessionID)
	if err != nil {
		if errors.Is(err, repositories.ErrSessionNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
            log.Printf("ERROR getting session %s for update check: %v", sessionID, err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve session for update"})
		}
		return
	}

	if existingSession.CreatorID != userID {
        log.Printf("WARN: User %s attempted to update session %s owned by %s", userID, sessionID, existingSession.CreatorID)
		ctx.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: You can only update your own sessions"})
		return
	}
    // --- Конец проверки авторизации ---


	// Передаем контекст запроса в репозиторий
	updatedSession, err := c.repo.Update(ctx.Request.Context(), sessionID, req)
	if err != nil {
		if errors.Is(err, repositories.ErrSessionNotFound) {
			// Это может случиться, если сессия была удалена между GetByID и Update (редко)
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
            log.Printf("ERROR updating session %s by user %s: %v", sessionID, userID, err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update session"})
		}
		return
	}

	ctx.JSON(http.StatusOK, updatedSession)
}

// Delete handles DELETE /sessions/:id
func (c *SessionController) Delete(ctx *gin.Context) {
	sessionIDStr := ctx.Param("id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID format"})
		return
	}

	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User identification failed"})
		return
	}

	// --- Авторизация: Проверяем, что пользователь - создатель сессии ---
	existingSession, err := c.repo.GetByID(ctx.Request.Context(), sessionID)
	if err != nil {
		if errors.Is(err, repositories.ErrSessionNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()}) // Сессия уже не существует
		} else {
            log.Printf("ERROR getting session %s for delete check: %v", sessionID, err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve session for deletion check"})
		}
		return
	}

	if existingSession.CreatorID != userID {
        // Возможно, стоит добавить проверку роли (администратор может удалять чужие сессии)
        // userRole, _ := ctx.Get(middleware.ContextUserRoleKey)
        // if userRole != "admin" { ... }
        log.Printf("WARN: User %s attempted to delete session %s owned by %s", userID, sessionID, existingSession.CreatorID)
		ctx.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: You can only delete your own sessions"})
		return
	}
    // --- Конец проверки авторизации ---


	// Передаем контекст запроса в репозиторий
	err = c.repo.Delete(ctx.Request.Context(), sessionID)
	if err != nil {
		if errors.Is(err, repositories.ErrSessionNotFound) {
			// Сессия была удалена кем-то другим между проверкой и удалением
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
            log.Printf("ERROR deleting session %s by user %s: %v", sessionID, userID, err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete session"})
		}
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Session deleted successfully"})
}

// GetParticipants handles GET /sessions/:id/participants
func (c *SessionController) GetParticipants(ctx *gin.Context) {
	sessionIDStr := ctx.Param("id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID format"})
		return
	}

	// Передаем контекст запроса в репозиторий
	participants, err := c.repo.GetParticipants(ctx.Request.Context(), sessionID)
	if err != nil {
        // Ошибки базы данных, не связанные с отсутствием участников (т.к. repo возвращает []models.User{}, nil)
        log.Printf("ERROR getting participants for session %s: %v", sessionID, err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve participants"})
		return
	}
    // Гарантируем возврат [] вместо null
    if participants == nil {
        participants = []models.User{}
    }

	ctx.JSON(http.StatusOK, participants)
}

// JoinSession обрабатывает POST /sessions/:id/join
func (c *SessionController) JoinSession(ctx *gin.Context) {
	sessionIDStr := ctx.Param("id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID format"})
		return
	}

	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User identification failed"})
		return
	}

    requestContext := ctx.Request.Context()

    // 1. Проверяем, существует ли сессия и не создатель ли пытается присоединиться
    session, err := c.repo.GetByID(requestContext, sessionID)
    if err != nil {
        if errors.Is(err, repositories.ErrSessionNotFound) {
			ctx.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
            log.Printf("ERROR getting session %s for join check: %v", sessionID, err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve session"})
		}
		return
    }

    // Запрещаем создателю присоединяться к своей сессии как участнику (опционально, зависит от логики)
    if session.CreatorID == userID {
         ctx.JSON(http.StatusBadRequest, gin.H{"error": "Creator cannot join their own session as a participant"})
         return
    }

    // 2. Проверяем количество участников
    currentParticipants, err := c.repo.CountParticipants(requestContext, sessionID)
    if err != nil {
        log.Printf("ERROR counting participants for session %s before join: %v", sessionID, err)
        ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check participant count"})
        return
    }

    if currentParticipants >= session.MaxParticipants {
        ctx.JSON(http.StatusConflict, gin.H{"error": repositories.ErrSessionFull.Error()}) // Используем ошибку репозитория
        return
    }

	// 3. Пытаемся присоединиться (репозиторий проверит, не присоединен ли уже)
	err = c.repo.JoinSession(requestContext, sessionID, userID)
	if err != nil {
        if errors.Is(err, repositories.ErrAlreadyJoined) {
            ctx.JSON(http.StatusConflict, gin.H{"error": err.Error()})
        } else if errors.Is(err, repositories.ErrDatabase){ // Обрабатываем другие возможные ошибки БД
             log.Printf("ERROR joining session %s for user %s: %v", sessionID, userID, err)
             ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join session due to a database issue"})
        } else {
            // Непредвиденная ошибка
            log.Printf("UNEXPECTED ERROR joining session %s for user %s: %v", sessionID, userID, err)
            ctx.JSON(http.StatusInternalServerError, gin.H{"error": "An unexpected error occurred while joining the session"})
        }
		return
	}
	// Уведомление
	session, errSession := c.repo.GetByID(requestContext, sessionID)
	if errSession != nil { /* обработка ошибки */ }

	joiningUser, errUser := c.userRepo.GetByID(requestContext, userID) // Нужен UserRepo в SessionController
	if errUser != nil { /* обработка ошибки */ }

	if session != nil && joiningUser != nil && session.CreatorID != userID { // Не уведомляем, если создатель сам "присоединился"
    	notifMsg := fmt.Sprintf("User '%s' joined your session '%s'.", joiningUser.Name, session.Title)
    	newNotif := models.Notification {
        	UserID:      session.CreatorID,
        	Message:     notifMsg,
        	Type:        models.NotificationTypeNewParticipant,
        	RelatedID:   &session.ID,
        	RelatedType: "session",
    	}
    _, errNotif := c.notifRepo.CreateNotification(requestContext, newNotif)
    if errNotif != nil {
        log.Printf("WARN: Failed to create notification for new participant: %v", errNotif)
    }
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "Successfully joined the session"})
}

// LeaveSession обрабатывает POST /sessions/:id/leave
func (c *SessionController) LeaveSession(ctx *gin.Context) {
	sessionIDStr := ctx.Param("id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID format"})
		return
	}

	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User identification failed"})
		return
	}

    // Опционально: Проверить, существует ли сессия (хотя Delete вернет ошибку, если FK нарушен)
    // _, err = c.repo.GetByID(ctx.Request.Context(), sessionID)
    // if err != nil { ... }


	// Пытаемся покинуть сессию (репозиторий проверит, был ли пользователь участником)
	err = c.repo.LeaveSession(ctx.Request.Context(), sessionID, userID)
	if err != nil {
        if errors.Is(err, repositories.ErrNotJoined) {
             ctx.JSON(http.StatusConflict, gin.H{"error": err.Error()}) // Или StatusNotFound, если считать "не найден" более подходящим
        } else if errors.Is(err, repositories.ErrDatabase){
            log.Printf("ERROR leaving session %s for user %s: %v", sessionID, userID, err)
            ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to leave session due to a database issue"})
        } else {
             log.Printf("UNEXPECTED ERROR leaving session %s for user %s: %v", sessionID, userID, err)
             ctx.JSON(http.StatusInternalServerError, gin.H{"error": "An unexpected error occurred while leaving the session"})
        }
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Successfully left the session"})
}


// GetRecommendedSessions обрабатывает GET /api/sessions/recommended
func (c *SessionController) GetRecommendedSessions(ctx *gin.Context) {
	var recommendedSessions []models.Session
	var err error
	limit := 5 // Количество рекомендаций по умолчанию

	userIDValue, userExists := ctx.Get(middleware.ContextUserIDKey) // Получаем ID пользователя, если он авторизован

	requestContext := ctx.Request.Context()

	if userExists {
		userID, ok := userIDValue.(uuid.UUID)
		if !ok {
			log.Printf("ERROR: UserID in context is not uuid.UUID in GetRecommendedSessions")
			// Если userID невалиден, ведем себя как неавторизованный
			recommendedSessions, err = c.repo.GetGeneralRecommendedSessions(requestContext, limit)
		} else {
			// Получаем навыки пользователя (нужен доступ к UserRepository или передача навыков)
			// Для простоты MVP, предположим, что навыки мы можем получить или они не важны для первой версии рекомендаций
			// Здесь можно было бы вызвать userRepo.GetByID(userID) и взять user.Skills
			// Пока что используем пустой срез навыков, что приведет к общей рекомендации для авторизованных
			var userSkills []string
            // TODO: Если есть userRepo, получить user.Skills
            // tempUser, userErr := c.userRepo.GetByID(requestContext, userID) // Потребует внедрения userRepo
            // if userErr == nil && tempUser != nil {
            //     userSkills = tempUser.Skills // pq.StringArray нужно будет конвертировать в []string
            // }

			recommendedSessions, err = c.repo.GetRecommendedSessionsForUser(requestContext, userID, userSkills, limit)
		}
	} else {
		// Неавторизованный пользователь
		recommendedSessions, err = c.repo.GetGeneralRecommendedSessions(requestContext, limit)
	}

	if err != nil {
		// Ошибка уже залогирована в репозитории
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve recommended sessions"})
		return
	}

	ctx.JSON(http.StatusOK, recommendedSessions)
}


// ExportSessionICS обрабатывает GET /api/sessions/:id/ics
func (c *SessionController) ExportSessionICS(ctx *gin.Context) {
    sessionIDStr := ctx.Param("id")
    sessionID, err := uuid.Parse(sessionIDStr)
    if err != nil {
        ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID format"})
        return
    }

    requestContext := ctx.Request.Context()
    session, err := c.repo.GetByID(requestContext, sessionID)
    if err != nil {
        if errors.Is(err, repositories.ErrSessionNotFound) {
            ctx.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
        } else {
            log.Printf("Error fetching session %s for ICS export: %v", sessionID, err)
            ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve session data"})
        }
        return
    }
    if session == nil {
         ctx.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
         return
    }


    // --- Генерация ICS ---
    cal := ics.NewCalendar()
    cal.SetMethod(ics.MethodRequest) 

    event := cal.AddEvent(session.ID.String()) // Уникальный ID для события
    event.SetCreatedTime(session.CreatedAt)
    event.SetDtStampTime(time.Now()) // Время создания ICS файла
    event.SetModifiedAt(session.UpdatedAt)
    event.SetStartAt(session.DateTime)

    // Рассчитаем примерную длительность сессии (например, 1.5 часа)
    // В реальном приложении у сессии должно быть поле duration или end_time
    assumedDuration := 90 * time.Minute
    event.SetEndAt(session.DateTime.Add(assumedDuration))

    event.SetSummary(session.Title)
    event.SetLocation(session.Location)
    event.SetDescription(session.Description)
    event.SetURL("http://localhost:3000/sessions/" + session.ID.String()) // Ссылка на сессию на сайте

    // Установка заголовков для скачивания файла
    ctx.Header("Content-Type", "text/calendar; charset=utf-8")
    ctx.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"session-%s.ics\"", session.Title))

    // Отправка ICS данных
    calString := cal.Serialize()
    ctx.String(http.StatusOK, calString)
}

