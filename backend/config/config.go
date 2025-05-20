package config

import (
    "fmt"
    "github.com/jmoiron/sqlx"
    "github.com/joho/godotenv"
    "log"
    "os"
    _ "github.com/lib/pq"
)

// Config содержит всю конфигурацию приложения
type Config struct {
    ServerPort string
    DBHost     string
    DBPort     string
    DBUser     string
    DBPassword string
    DBName     string
    JWTConfig  JWTConfig
}

// LoadConfig загружает конфигурацию из переменных среды
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

// InitDB инициализирует подключение к базе данных
func InitDB(cfg Config) (*sqlx.DB, error) {
    var dsn string
    databaseURL := os.Getenv("DATABASE_URL")

    if databaseURL != "" {
        dsn = databaseURL
        log.Println("InitDB: Using DATABASE_URL environment variable for connection.")
    } else {
        // Fallback to individual components if DATABASE_URL is not set (for local dev without DATABASE_URL)
        log.Println("InitDB: DATABASE_URL not set, constructing DSN from individual DB_HOST, DB_PORT, etc.")
        dsn = fmt.Sprintf(
            "host=%s port=%s user=%s password=%s dbname=%s sslmode=%s", // Use %s for sslmode
            cfg.DBHost,
            cfg.DBPort,
            cfg.DBUser,
            cfg.DBPassword,
            cfg.DBName,
            GetEnv("DB_SSLMODE", "disable"),
        )
    }
    log.Printf("InitDB: Attempting to connect with DSN (credentials redacted in actual log if printed): %s", "[DSN_Structure_Only]")


    db, err := sqlx.Connect("postgres", dsn)
    if err != nil {
        return nil, fmt.Errorf("failed to connect to application database using DSN: %w", err)
    }

    return db, nil
}
