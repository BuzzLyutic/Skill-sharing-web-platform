package main

import (
	"log"

	"github.com/BuzzLyutic/Skill-sharing-web-platform/config"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/repositories"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/routes"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/tasks"
)

func main() {
    // Загрузка конфигурации
    cfg := config.LoadConfig()

    // Инициализация базы данных
    db, err := config.InitDB(cfg)
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }

    // Настройка маршрутизатора
    r := routes.SetupRouter(db)

    sessionRepo := repositories.NewSessionRepository(db)
    userRepo := repositories.NewUserRepository(db)
    notifRepo := repositories.NewNotificationRepository(db)

    // Запуск фоновой задачи для проверки напоминаний
    go tasks.CheckSessionReminders(db, sessionRepo, userRepo, notifRepo) // Передаем зависимости
    log.Printf("Server starting on port %s", cfg.ServerPort)
    if err := r.Run(":" + cfg.ServerPort); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}
