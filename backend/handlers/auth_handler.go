package handlers

import (
    "errors"
    "net/http"
    "time"
    "log"
    "fmt"
    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"
    "golang.org/x/crypto/bcrypt"
    
    "github.com/BuzzLyutic/Skill-sharing-web-platform/config"
    "github.com/BuzzLyutic/Skill-sharing-web-platform/models"
    "github.com/BuzzLyutic/Skill-sharing-web-platform/repositories"
    "github.com/BuzzLyutic/Skill-sharing-web-platform/middleware"
)

// AuthHandler обрабатывает запросы аутентификации
type AuthHandler struct {
    userRepo *repositories.UserRepository
    jwtCfg   config.JWTConfig
}

func NewAuthHandler(db *sqlx.DB, jwtCfg config.JWTConfig) *AuthHandler {
	return &AuthHandler{
		userRepo: repositories.NewUserRepository(db),
		jwtCfg:   jwtCfg,
	}
}


// Register обрабатывает регистрацию нового пользователя
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
        log.Printf("Register: Failed to bind JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

    // Запрещаем установку роли admin/moderator через обычную регистрацию
    if models.Role(req.Role) == models.RoleAdmin || models.Role(req.Role) == models.RoleModerator {
         log.Printf("WARN: Attempt to register user %s with privileged role %s", req.Email, req.Role)
         // Можно или игнорировать поле Role, или вернуть ошибку
         // Игнорируем:
         req.Role = "" // Репозиторий установит 'user' по умолчанию
         // Или ошибка:
         // c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot self-assign privileged roles during registration"})
         // return
    }


	requestContext := c.Request.Context() // Получаем контекст

	// Проверяем, существует ли пользователь с таким email
	_, err := h.userRepo.GetByEmail(requestContext, req.Email) // Передаем контекст!
	if err == nil { // Ошибки нет - пользователь найден
		c.JSON(http.StatusConflict, gin.H{"error": "User with this email already exists"})
		return
	}
	if !errors.Is(err, repositories.ErrUserNotFound) { // Если ошибка не "не найдено" - это проблема
        log.Printf("Register: Error checking email existence for %s: %v", req.Email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check user existence"})
		return
	}

	// Хешируем пароль
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
        log.Printf("Register: Failed to hash password for %s: %v", req.Email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process registration"})
		return
	}

	// Создаем пользователя
	// Передаем контекст! Репозиторий вернет *models.User
	user, err := h.userRepo.CreateUser(requestContext, req, string(passwordHash))
	if err != nil {
        // Репозиторий уже залогировал ошибку БД
        // Проверяем на специфичную ошибку дубликата email
        if err.Error() == fmt.Sprintf("user with email '%s' already exists", req.Email) {
             c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
        } else {
		    c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
        }
		return
	}
    if user == nil { // Доп. проверка
         log.Printf("Register: User creation returned nil user for %s without error", req.Email)
         c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
         return
    }


	// Генерируем токены
	accessToken, refreshToken, expiresIn, err := h.generateTokens(*user) // Разыменовываем указатель
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate authentication tokens"})
		return
	}

	// Сохраняем refresh token в базе данных
	if err := h.userRepo.SaveRefreshToken(requestContext, user.ID, &refreshToken); err != nil { // Передаем контекст!
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize registration"})
		return
	}

	c.JSON(http.StatusCreated, models.TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    expiresIn,
	})
}

// Login обрабатывает вход пользователя
func (h *AuthHandler) Login(c *gin.Context) {
    var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
        log.Printf("Login: Failed to bind JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

    requestContext := c.Request.Context()

	// Находим пользователя по email
	user, err := h.userRepo.GetByEmail(requestContext, req.Email) // Передаем контекст!
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		} else {
            log.Printf("Login: Error fetching user %s: %v", req.Email, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process login request"})
		}
		return
	}
    if user == nil { // Доп. проверка
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
        return
    }


    if user.PasswordHash == nil || *user.PasswordHash == "" {
         log.Printf("Login: Attempt to login with password for user %s without password hash", req.Email)
         c.JSON(http.StatusUnauthorized, gin.H{"error": "Password login not available for this account"})
         return
    }

	// Проверяем пароль
	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Генерируем токены
	accessToken, refreshToken, expiresIn, err := h.generateTokens(*user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate authentication tokens"})
		return
	}

	// Сохраняем refresh token
	if err := h.userRepo.SaveRefreshToken(requestContext, user.ID, &refreshToken); err != nil { // Передаем контекст!
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to finalize login"})
		return
	}

	c.JSON(http.StatusOK, models.TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    expiresIn,
	})
}

// RefreshToken обрабатывает обновление JWT токена
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req models.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
        log.Printf("RefreshToken: Failed to bind JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}
    if req.RefreshToken == "" {
         c.JSON(http.StatusBadRequest, gin.H{"error": "Refresh token is required"})
         return
    }

    requestContext := c.Request.Context()

	// Находим пользователя по refresh token
	user, err := h.userRepo.GetUserByRefreshToken(requestContext, req.RefreshToken) // Передаем контекст!
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
            log.Printf("WARN: Invalid refresh token presented: %s...", req.RefreshToken[:min(len(req.RefreshToken), 10)])
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired refresh token"})
		} else {
            log.Printf("RefreshToken: Error validating refresh token: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate refresh token"})
		}
		return
	}
    if user == nil { // Доп. проверка
         c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired refresh token"})
         return
    }

	// Генерируем новые токены
	accessToken, refreshToken, expiresIn, err := h.generateTokens(*user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate new tokens"})
		return
	}

	// Сохраняем новый refresh token
	if err := h.userRepo.SaveRefreshToken(requestContext, user.ID, &refreshToken); err != nil { // Передаем контекст!
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save new refresh token"})
		return
	}

	c.JSON(http.StatusOK, models.TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    expiresIn,
	})
}

// GetMe возвращает информацию о текущем пользователе
func (h *AuthHandler) GetMe(c *gin.Context) {
    // Используем безопасное извлечение ID
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: User identification failed"})
		return
	}

    requestContext := c.Request.Context()

	user, err := h.userRepo.GetByID(requestContext, userID) // Передаем контекст!
	if err != nil {
        if errors.Is(err, repositories.ErrUserNotFound) {
             log.Printf("GetMe: User %s not found in DB, but token was valid?", userID)
             c.JSON(http.StatusNotFound, gin.H{"error": "User associated with token not found"})
        } else {
		    log.Printf("GetMe: Failed to get user %s: %v", userID, err)
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user information"})
        }
		return
	}
    if user == nil { // Доп. проверка
         c.JSON(http.StatusNotFound, gin.H{"error": "User associated with token not found"})
         return
    }

    // Модель User скрывает пароль/токен через json:"-"
	c.JSON(http.StatusOK, user)
}

// Logout обрабатывает выход пользователя из системы
func (h *AuthHandler) Logout(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
        // Если ID не найден, возможно токен уже невалиден, просто выходим
		c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully (no valid user session found)"})
		return
	}

    requestContext := c.Request.Context()

	// Удаляем refresh token
	err := h.userRepo.InvalidateRefreshToken(requestContext, userID) // Передаем контекст!
    if err != nil && !errors.Is(err, repositories.ErrUserNotFound) {
        // Логируем ошибку, если это не просто "юзер не найден"
        log.Printf("Logout: Failed to invalidate refresh token for user %s: %v", userID, err)
        // Все равно отвечаем успехом, т.к. сессия на клиенте будет удалена
	}

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// generateTokens ... (оставляем как есть, с использованием констант)
func (h *AuthHandler) generateTokens(user models.User) (string, string, int64, error) {
    // ... (код с использованием middleware.ContextUserIDKey и т.д.) ...
	accessTokenExpiration := time.Now().Add(h.jwtCfg.AccessTokenDuration)
	accessTokenClaims := jwt.MapClaims{
		middleware.ContextUserIDKey: user.ID.String(),
		middleware.ContextEmailKey:  user.Email,
		middleware.ContextRoleKey:   user.Role, // Передаем роль как строку
		"exp":                       accessTokenExpiration.Unix(),
	}
	// ... (генерация access token)
	refreshTokenExpiration := time.Now().Add(h.jwtCfg.RefreshTokenDuration)
	refreshTokenClaims := jwt.MapClaims{
		middleware.ContextUserIDKey: user.ID.String(),
		"exp":                       refreshTokenExpiration.Unix(),
	}
    // ... (генерация refresh token)
	// ... (возврат)
    accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessTokenClaims)
    accessTokenString, err := accessToken.SignedString([]byte(h.jwtCfg.SecretKey))
    if err != nil {
        log.Printf("ERROR generating access token for user %s: %v", user.ID, err)
		return "", "", 0, fmt.Errorf("failed to sign access token: %w", err)
	}
    refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshTokenClaims)
    refreshTokenString, err := refreshToken.SignedString([]byte(h.jwtCfg.SecretKey))
    if err != nil {
        log.Printf("ERROR generating refresh token for user %s: %v", user.ID, err)
		return "", "", 0, fmt.Errorf("failed to sign refresh token: %w", err)
	}
	expiresIn := int64(h.jwtCfg.AccessTokenDuration.Seconds())
	return accessTokenString, refreshTokenString, expiresIn, nil
}

// getUserIDFromContext извлекает User ID из контекста Gin.
func getUserIDFromContext(ctx *gin.Context) (uuid.UUID, bool) {
	userIDValue, exists := ctx.Get(middleware.ContextUserIDKey) // Используем константу из middleware
	if !exists {
		// log.Printf("DEBUG: UserID key '%s' not found in context", middleware.ContextUserIDKey) // Для отладки
		return uuid.Nil, false
	}

	userID, ok := userIDValue.(uuid.UUID) // Утверждение типа
	if !ok {
		log.Printf("ERROR: UserID in context is not of type uuid.UUID. Actual type: %T", userIDValue)
		return uuid.Nil, false
	}
    if userID == uuid.Nil {
        log.Printf("WARN: Nil UserID found in context")
        return uuid.Nil, false // Невалидный ID
    }

	return userID, true
}

// getUserRoleFromContext извлекает роль пользователя из контекста Gin.
func getUserRoleFromContext(ctx *gin.Context) (models.Role, bool) {
	roleValue, exists := ctx.Get(middleware.ContextRoleKey) // Используем константу
	if !exists {
        // log.Printf("DEBUG: Role key '%s' not found in context", middleware.ContextRoleKey) // Для отладки
		return "", false
	}
	roleStr, ok := roleValue.(string)
	if !ok {
        log.Printf("ERROR: Role in context is not of type string. Actual type: %T", roleValue)
		return "", false
	}
    role := models.Role(roleStr)
    // Проверяем, валидна ли роль из контекста
    if !models.IsValidRole(role){
        log.Printf("WARN: Invalid role value '%s' found in context", roleStr)
        return "", false
    }
	return role, true
}

// Вспомогательная функция min для RefreshToken лога
func min(a, b int) int {
    if a < b {
        return a
    }
    return b
}