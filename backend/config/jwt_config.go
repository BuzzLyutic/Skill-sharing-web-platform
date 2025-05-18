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

// Вспомогательная функция для получения переменной окружения или значения по умолчанию
func GetEnv(key, defaultValue string) string {
    if value, exists := os.LookupEnv(key); exists {
        return value
    }
    return defaultValue
}

// Вспомогательная функция для получения переменной окружения в виде целого числа
func getEnvAsInt(key string, defaultValue int) int {
    if valueStr, exists := os.LookupEnv(key); exists {
        if value, err := strconv.Atoi(valueStr); err == nil {
            return value
        }
    }
    return defaultValue
}