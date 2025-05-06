package routes

import (
        "github.com/BuzzLyutic/Skill-sharing-web-platform/controllers"
        "github.com/BuzzLyutic/Skill-sharing-web-platform/handlers"
        "github.com/BuzzLyutic/Skill-sharing-web-platform/middleware"
        "github.com/BuzzLyutic/Skill-sharing-web-platform/repositories"
        "github.com/BuzzLyutic/Skill-sharing-web-platform/models"
        "github.com/BuzzLyutic/Skill-sharing-web-platform/config"
        "github.com/gin-contrib/cors"
        "github.com/gin-gonic/gin"
        "github.com/jmoiron/sqlx"
)

// SetupRouter configures the Gin router
func SetupRouter(db *sqlx.DB) *gin.Engine {
        r := gin.Default()
        cfg := config.LoadConfig()
    
        jwtCfg := config.GetJWTConfig()
        // --- Middleware ---
	    jwtAuth := middleware.JWTAuthMiddleware(jwtCfg)
        adminAuth := middleware.RoleAuthMiddleware(models.RoleAdmin)
	    moderatorAuth := middleware.RoleAuthMiddleware(models.RoleModerator)

        // Настройка CORS
        corsConfig := cors.DefaultConfig()
        corsConfig.AllowOrigins = []string{"http://localhost:3000"}
        corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
        corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
        corsConfig.AllowCredentials = true
        r.Use(cors.New(corsConfig))
    
        // Initialize repositories
        userRepo := repositories.NewUserRepository(db)
        sessionRepo := repositories.NewSessionRepository(db)
        feedbackRepo := repositories.NewFeedbackRepository(db)

        // Initialize controllers
        userController := controllers.NewUserController(userRepo)
        sessionController := controllers.NewSessionController(sessionRepo)
        feedbackController := controllers.NewFeedbackController(feedbackRepo, sessionRepo)
    
        // Initialize auth handlers
        authHandler := handlers.NewAuthHandler(db, jwtCfg)
        oauthHandler := handlers.NewOAuthHandler(db, cfg)
    
        // Auth routes (публичные маршруты)
        authGroup := r.Group("/auth")
        {
            authGroup.POST("/register", authHandler.Register)
            authGroup.POST("/login", authHandler.Login)
            authGroup.POST("/refresh", authHandler.RefreshToken)
            
            // OAuth routes
            authGroup.GET("/google", oauthHandler.GoogleLogin)
            authGroup.GET("/google/callback", oauthHandler.GoogleCallback)
        }
    
        // API routes (защищенные маршруты)
        api := r.Group("/api")
        api.Use(jwtAuth)
        {
            // Logout route
            api.POST("/logout", authHandler.Logout)
            
            // User routes
            users := api.Group("/users")
            {
                users.GET("", userController.GetAll)
                users.GET("/:id", userController.GetByID)
                // Профиль текущего пользователя
                users.GET("/me", authHandler.GetMe)
            }

            // --- Admin Routes ---
		    admin := api.Group("/admin")
		    admin.Use(adminAuth) // Требуется роль admin
		    {
			    adminUsers := admin.Group("/users")
			    {
				    adminUsers.GET("", userController.GetAll)         // Список пользователей
				    adminUsers.GET("/:id", userController.GetByID)    // Конкретный пользователь
				    adminUsers.PUT("/:id/role", userController.UpdateUserRole) // Смена роли
				    adminUsers.DELETE("/:id", userController.Delete)  // Удаление пользователя
                    // adminUsers.PUT("/:id", userController.Update) // Можно оставить, если админ должен менять профиль
			    }
                // adminSessions := admin.Group("/sessions") ...
                // adminFeedback := admin.Group("/feedback") ...
		    }

            // Moderator routes
            moderator := api.Group("/moderator")
            moderator.Use(moderatorAuth)
            {
                moderator.DELETE("/sessions/:id", sessionController.Delete)
                //moderator.DELETE("/feedback/:id", feedbackController.Delete)
            }
    
            // Session routes
            sessions := api.Group("/sessions")
            {
                sessions.GET("", sessionController.GetAll)
                sessions.GET("/recommended", sessionController.GetRecommendedSessions)
                sessions.GET("/:id", sessionController.GetByID)
                sessions.POST("", sessionController.Create)
                sessions.PUT("/:id", sessionController.Update)
                sessions.DELETE("/:id", sessionController.Delete)
                sessions.GET("/:id/participants", sessionController.GetParticipants)

                // Endpoints для Join/Leave сессии
			    sessions.POST("/:id/join", sessionController.JoinSession)
			    sessions.POST("/:id/leave", sessionController.LeaveSession)

			    // Endpoints для отзывов/рейтингов
			    feedback := sessions.Group("/:id/feedback")
			    {
				    feedback.POST("", feedbackController.CreateFeedback)
				    feedback.GET("", feedbackController.GetFeedback)
			    }
            }
        }
    
        return r
    }
