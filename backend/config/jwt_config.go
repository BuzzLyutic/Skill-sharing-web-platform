package config

import (
    "time"
    "os"
    "strconv"
)

// JWTConfig содержит настройки для JWT аутентификации
type JWTConfig struct {
    SecretKey            string
    AccessTokenDuration  time.Duration
    RefreshTokenDuration time.Duration
}

// GetJWTConfig возвращает настройки JWT
func GetJWTConfig() JWTConfig {
    return JWTConfig{
        SecretKey:            GetEnv("JWT_SECRET_KEY", "your-secret-key-for-jwt-should-be-very-secure"),
        AccessTokenDuration:  time.Duration(getEnvAsInt("JWT_ACCESS_TOKEN_DURATION", 15)) * time.Minute,
        RefreshTokenDuration: time.Duration(getEnvAsInt("JWT_REFRESH_TOKEN_DURATION", 24*7)) * time.Hour,
    }
}

// Helper function to get an environment variable or a default value
func GetEnv(key, defaultValue string) string {
    if value, exists := os.LookupEnv(key); exists {
        return value
    }
    return defaultValue
}

// Helper function to get an environment variable as an integer
func getEnvAsInt(key string, defaultValue int) int {
    if valueStr, exists := os.LookupEnv(key); exists {
        if value, err := strconv.Atoi(valueStr); err == nil {
            return value
        }
    }
    return defaultValue
}