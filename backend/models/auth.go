package models

// RegisterRequest представляет запрос на регистрацию пользователя
type RegisterRequest struct {
    Email    string   `json:"email" binding:"required,email"`
    Password string   `json:"password" binding:"required,min=6"`
    Name     string   `json:"name" binding:"required"`
    Bio      string   `json:"bio,omitempty"`
    Skills   []string `json:"skills"`
    Role     string   `json:"role,omitempty"` 
}

// LoginRequest представляет запрос на вход в систему
type LoginRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required"`
}

// TokenResponse представляет ответ с токенами доступа
type TokenResponse struct {
    AccessToken  string `json:"access_token"`
    RefreshToken string `json:"refresh_token"`
    ExpiresIn    int64  `json:"expires_in"` // срок действия в секундах
}

// RefreshTokenRequest представляет запрос на обновление токена
type RefreshTokenRequest struct {
    RefreshToken string `json:"refresh_token" binding:"required"`
}

// OAuthRequest представляет запрос на вход через OAuth
type OAuthRequest struct {
    Provider string `json:"provider" binding:"required"` // "google" или "github"
    Token    string `json:"token" binding:"required"`    // token полученный от провайдера
}

// UserRoleUpdateRequest представляет запрос на смену роли пользователя админом
type UserRoleUpdateRequest struct {
    // Используем тип Role и добавляем валидацию `binding`
    Role Role `json:"role" binding:"required,oneof=user moderator admin"`
}
