package config

import (
    "fmt"
    "github.com/jmoiron/sqlx"
    "github.com/joho/godotenv"
    "log"
    _ "github.com/lib/pq"
)

// Config holds all application configuration
type Config struct {
    ServerPort string
    DBHost     string
    DBPort     string
    DBUser     string
    DBPassword string
    DBName     string
    JWTConfig  JWTConfig
}

// LoadConfig loads configuration from environment variables
func LoadConfig() Config {
    if err := godotenv.Load(".env"); err != nil {
        log.Println("No .env file found or failed to load")
    }
    return Config{
        ServerPort: GetEnv("SERVER_PORT", "8080"),
        DBHost:     GetEnv("DB_HOST", "localhost"),
        DBPort:     GetEnv("DB_PORT", "5432"),
        DBUser:     GetEnv("DB_USER", "postgres"),
        DBPassword: GetEnv("DB_PASSWORD", "password"),
        DBName:     GetEnv("DB_NAME", "skill-sharing-web-platform"),
        JWTConfig:  GetJWTConfig(),
    }
}

// InitDB initializes database connection
func InitDB(cfg Config) (*sqlx.DB, error) {
    dsn := fmt.Sprintf(
        "host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
        cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
    )

    db, err := sqlx.Connect("postgres", dsn)
    if err != nil {
        return nil, fmt.Errorf("failed to connect to database: %w", err)
    }

    return db, nil
}
