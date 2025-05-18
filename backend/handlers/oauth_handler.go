package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"
	"log"
	"net/url"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jmoiron/sqlx"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/middleware"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/config"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/models"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/repositories"
)

// OAuthHandler обрабатывает запросы OAuth аутентификации
type OAuthHandler struct {
	userRepo       *repositories.UserRepository
	jwtCfg         config.JWTConfig
	googleOAuthCfg *oauth2.Config
}

// NewOAuthHandler создает новый обработчик OAuth аутентификации
func NewOAuthHandler(db *sqlx.DB, cfg config.Config) *OAuthHandler {
    // Проверка наличия переменных окружения
    googleClientID := config.GetEnv("GOOGLE_CLIENT_ID", "")
	googleClientSecret := config.GetEnv("GOOGLE_CLIENT_SECRET", "")
    googleRedirectURL := config.GetEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/auth/google/callback") // URL бэкенда

    if googleClientID == "" || googleClientSecret == "" {
        log.Println("WARN: Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) not configured.")
        // Можно решить не инициализировать googleOAuthCfg или вернуть ошибку
    }

	googleOAuthCfg := &oauth2.Config{
		ClientID:     googleClientID,
		ClientSecret: googleClientSecret,
		RedirectURL:  googleRedirectURL,
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
		Endpoint:     google.Endpoint,
	}

	return &OAuthHandler{
		userRepo:       repositories.NewUserRepository(db),
		jwtCfg:         cfg.JWTConfig,
		googleOAuthCfg: googleOAuthCfg,
	}
}

// GoogleLogin инициирует процесс входа через Google
func (h *OAuthHandler) GoogleLogin(c *gin.Context) {
    if h.googleOAuthCfg == nil || h.googleOAuthCfg.ClientID == "" {
        log.Println("ERROR: GoogleLogin called but Google OAuth is not configured.")
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Google login is not available."})
        return
    }
	// Используем state для защиты от CSRF (рекомендуется генерировать случайный state)
	// Здесь для простоты используем "state"
	url := h.googleOAuthCfg.AuthCodeURL("state", oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// GoogleCallback обрабатывает callback от Google
func (h *OAuthHandler) GoogleCallback(c *gin.Context) {
    if h.googleOAuthCfg == nil || h.googleOAuthCfg.ClientID == "" {
         log.Println("ERROR: GoogleCallback called but Google OAuth is not configured.")
         c.JSON(http.StatusInternalServerError, gin.H{"error": "Google login callback is not available."})
         return
    }

	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Authorization code not provided by Google"})
		return
	}

    // Используем контекст запроса для обмена токена и запроса к API Google
    requestContext := c.Request.Context()

	// Обмен кода на токен
	token, err := h.googleOAuthCfg.Exchange(requestContext, code) 
	if err != nil {
        log.Printf("ERROR: Failed to exchange Google token: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to validate Google authorization"})
		return
	}

    // Получение информации о пользователе
	client := h.googleOAuthCfg.Client(requestContext, token) 
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo") // Запрос к API Google
	if err != nil {
        log.Printf("ERROR: Failed to get user info from Google: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user information from Google"})
		return
	}
	defer resp.Body.Close()

	var userInfo struct {
		ID            string `json:"id"`
		Email         string `json:"email"`
		VerifiedEmail bool   `json:"verified_email"`
		Name          string `json:"name"`
		GivenName     string `json:"given_name"`
		FamilyName    string `json:"family_name"`
		Picture       string `json:"picture"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
        log.Printf("ERROR: Failed to decode Google user info: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process user information from Google"})
		return
	}

    // Важно: Проверяем, подтвержден ли email в Google
    if !userInfo.VerifiedEmail {
         log.Printf("WARN: Google account email not verified for %s", userInfo.Email)
         c.JSON(http.StatusForbidden, gin.H{"error": "Google account email must be verified to log in."})
         return
    }

    // Передаем управление общему обработчику OAuth
	h.handleOAuthUser(c, "google", userInfo.ID, userInfo.Email, userInfo.Name, userInfo.Picture)
}

// handleOAuthUser обрабатывает пользователя после получения данных от OAuth-провайдера
// Добавлен avatarURL
func (h *OAuthHandler) handleOAuthUser(c *gin.Context, provider, oauthID, email, name, avatarURL string) {
    var user *models.User // Используем указатель
	var err error
    requestContext := c.Request.Context() // Контекст для запросов к БД

	// 1. Попытка найти пользователя по OAuth данным
	user, err = h.userRepo.GetByOAuth(requestContext, provider, oauthID) 
	if err != nil {
		if !errors.Is(err, repositories.ErrUserNotFound) {
			log.Printf("Error checking user by OAuth (%s, %s): %v", provider, oauthID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error during login"})
			return
		}
        // Ошибка ErrUserNotFound - ищем по email
		log.Printf("User not found by OAuth (%s, %s). Checking by email: %s", provider, oauthID, email)
		user, err = h.userRepo.GetByEmail(requestContext, email) 
		if err != nil {
			if !errors.Is(err, repositories.ErrUserNotFound) {
				log.Printf("Error checking user by email (%s): %v", email, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error during login"})
				return
			}

			// Пользователь не найден ни по OAuth, ни по email -> Создаем нового
			log.Printf("User not found by email (%s). Creating new user.", email)
            providerStr := provider // Создаем копию строки, чтобы взять адрес
			newUser := models.User{
				Email:         email,
				OAuthProvider: &providerStr,
				OAuthID:       &oauthID,
				Name:          name,
				Role:          string(models.RoleUser), // Устанавливаем роль по умолчанию
			}

			createdUser, creationErr := h.userRepo.CreateOAuthUser(requestContext, newUser)
			if creationErr != nil {
                // Проверяем на конфликт email, если вдруг гонка состояний
                if creationErr.Error() == fmt.Sprintf("user with email '%s' already exists", email) {
                    c.JSON(http.StatusConflict, gin.H{"error": creationErr.Error()})
                } else {
				    log.Printf("Failed to create OAuth user (%s, %s, %s): %v", provider, email, name, creationErr)
				    c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user account"})
                }
				return
			}
			user = createdUser // Используем созданного пользователя
			log.Printf("Successfully created new user %s via OAuth %s", user.ID, provider)

		} else {
            // Пользователь найден по email -> Связываем OAuth
            if user == nil { // Доп. проверка на nil после GetByEmail
                 log.Printf("ERROR: GetByEmail returned nil user for email %s without error", email)
                 c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process login"})
                 return
            }

			log.Printf("User found by email (%s). Linking OAuth (%s, %s) to user %s", email, provider, oauthID, user.ID)
			// Проверяем, не связан ли аккаунт уже с *другим* OAuth этого же провайдера
			if user.OAuthProvider != nil && *user.OAuthProvider == provider && user.OAuthID != nil && *user.OAuthID != oauthID {
				log.Printf("User %s (%s) already linked to different %s account (%s != %s). Denying link.", user.ID, user.Email, provider, *user.OAuthID, oauthID)
				c.JSON(http.StatusConflict, gin.H{"error": "This email is already linked to a different " + provider + " account."})
				return
			}
             // Проверяем, не связан ли аккаунт УЖЕ с каким-то ДРУГИМ OAuth провайдером
             if user.OAuthProvider != nil && *user.OAuthProvider != provider && user.OAuthID != nil {
                 log.Printf("User %s (%s) already linked to a different provider (%s). Denying link.", user.ID, user.Email, *user.OAuthProvider)
                 c.JSON(http.StatusConflict, gin.H{"error": "This email is already linked to a different login provider (" + *user.OAuthProvider + ")." })
                 return
             }

            // Если аккаунт еще не связан с этим провайдером, связываем
            if user.OAuthProvider == nil || *user.OAuthProvider != provider || user.OAuthID == nil {
			    linkErr := h.userRepo.LinkOAuthToUser(requestContext, user.ID, provider, oauthID) // Передаем контекст!
			    if linkErr != nil {
				    log.Printf("Failed to link OAuth (%s, %s) to user %s (%s): %v", provider, oauthID, user.ID, user.Email, linkErr)
				    c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link OAuth account"})
				    return
			    }
                // Обновляем данные в памяти, если необходимо (для генерации токена)
                providerStr := provider
                user.OAuthProvider = &providerStr
                user.OAuthID = &oauthID
                log.Printf("Successfully linked OAuth %s to existing user %s", provider, user.ID)
            } else {
                 log.Printf("OAuth %s already linked to user %s. Proceeding with login.", provider, user.ID)
            }
		}
	} else {
		// Пользователь найден по OAuth данным -> Просто логинимся
        if user == nil { // Доп. проверка на nil после GetByOAuth
             log.Printf("ERROR: GetByOAuth returned nil user for %s/%s without error", provider, oauthID)
             c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process login"})
             return
        }
		log.Printf("User %s found by OAuth (%s, %s). Logging in.", user.ID, provider, oauthID)
	}

	// --- Генерация и отправка токенов ---
	accessToken, refreshToken, expiresIn, err := h.generateTokens(*user) // Разыменовываем указатель
	if err != nil {
		log.Printf("Failed to generate tokens for user %s (%s): %v", user.ID, user.Email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate authentication tokens"})
		return
	}

	// Сохраняем refresh token (Передаем контекст!)
	if err := h.userRepo.SaveRefreshToken(requestContext, user.ID, &refreshToken); err != nil {
		log.Printf("WARN: Failed to save refresh token for user %s (%s): %v", user.ID, user.Email, err)
		// Не критично для OAuth входа, продолжаем
	}

	// Редирект на фронтенд с токенами во фрагменте
    // Убедитесь, что URL фронтенда правильный (из конфига или env)
    frontendCallbackURL := config.GetEnv("FRONTEND_OAUTH_CALLBACK_URL", "http://localhost:3000/auth/callback")

	callbackURL := fmt.Sprintf(
	"%s#access_token=%s&refresh_token=%s&expires_in=%d&provider=%s", // Добавим provider для информации
	frontendCallbackURL,
	url.QueryEscape(accessToken),
	url.QueryEscape(refreshToken),
	expiresIn,
    url.QueryEscape(provider),
	)

	c.Redirect(http.StatusTemporaryRedirect, callbackURL)
}

func (h *OAuthHandler) generateTokens(user models.User) (string, string, int64, error) {
	accessTokenExpiration := time.Now().Add(h.jwtCfg.AccessTokenDuration)
	accessTokenClaims := jwt.MapClaims{
		middleware.ContextUserIDKey: user.ID.String(), 
		middleware.ContextEmailKey:  user.Email,       
		middleware.ContextRoleKey:   user.Role,        
		"exp":                       accessTokenExpiration.Unix(),
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessTokenClaims)
	accessTokenString, err := accessToken.SignedString([]byte(h.jwtCfg.SecretKey))
	if err != nil {
        log.Printf("ERROR generating access token for user %s: %v", user.ID, err)
		return "", "", 0, fmt.Errorf("failed to sign access token: %w", err)
	}

	refreshTokenExpiration := time.Now().Add(h.jwtCfg.RefreshTokenDuration)
	refreshTokenClaims := jwt.MapClaims{
		middleware.ContextUserIDKey: user.ID.String(), // Используем константу
		"exp":                       refreshTokenExpiration.Unix(),
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
