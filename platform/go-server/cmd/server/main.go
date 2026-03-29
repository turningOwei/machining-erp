package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"machining-erp/internal/config"
	"machining-erp/internal/handlers"
	"machining-erp/internal/middleware"
	"machining-erp/internal/repository"
	"machining-erp/internal/services"
	"machining-erp/pkg/database"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// 根据 GO_ENV 加载不同的配置文件
	env := os.Getenv("GO_ENV")
	if env == "" {
		env = "local"
	}

	envFile := ".env." + env
	if _, err := os.Stat(envFile); err == nil {
		if err := godotenv.Load(envFile); err != nil {
			log.Printf("Warning: Error loading %s: %v", envFile, err)
		} else {
			log.Printf("Loaded config from %s", envFile)
		}
	} else {
		// 回退到默认 .env
		godotenv.Load()
	}

	// 加载配置
	cfg := config.Load()

	// 连接数据库
	db, err := database.Connect(&database.Config{
		Host:     cfg.MySQLHost,
		User:     cfg.MySQLUser,
		Password: cfg.MySQLPassword,
		Database: cfg.MySQLDatabase,
		Port:     cfg.MySQLPort,
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// 初始化服务
	authService := services.NewAuthService(
		cfg.AdminUser,
		cfg.AdminPassword,
		cfg.MaxLoginAttempts,
		time.Duration(cfg.LockDurationMinutes)*time.Minute,
	)
	orderNumSvc := services.NewOrderNumberService(db)

	// 初始化仓库
	customerRepo := repository.NewCustomerRepository(db)
	orderRepo := repository.NewOrderRepository(db)
	orderItemRepo := repository.NewOrderItemRepository(db)
	processRepo := repository.NewOrderProcessRepository(db)
	materialRepo := repository.NewMaterialRepository(db)
	remnantRepo := repository.NewRemnantRepository(db)
	adventRuleRepo := repository.NewAdventRuleRepository(db)

	// 初始化处理器
	authHandler := handlers.NewAuthHandler(authService)
	customerHandler := handlers.NewCustomerHandler(customerRepo)
	orderHandler := handlers.NewOrderHandler(orderRepo, orderItemRepo, processRepo, orderNumSvc)
	itemHandler := handlers.NewOrderItemHandler(orderItemRepo, orderRepo, processRepo)
	processHandler := handlers.NewProcessHandler(processRepo, orderItemRepo, orderRepo)
	materialHandler := handlers.NewMaterialHandler(materialRepo)
	remnantHandler := handlers.NewRemnantHandler(remnantRepo)
	financeHandler := handlers.NewFinanceHandler(db)
	adventRuleHandler := handlers.NewAdventRuleHandler(adventRuleRepo)

	// 创建 Gin 路由
	r := gin.New()

	// 中间件
	r.Use(gin.Recovery())
	r.Use(func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		log.Printf("[REQUEST] %s %s | %d | %v", method, path, status, latency)
	})
	r.Use(middleware.CORS())

	// 健康检查
	r.GET("/api/platform/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"version": "go-gin",
			"time":    time.Now().Format(time.RFC3339),
		})
	})

	// 认证路由 (无需鉴权)
	auth := r.Group("/api/platform")
	{
		auth.POST("/login", authHandler.Login)
		auth.GET("/auth/status", authHandler.Status)
		auth.POST("/logout", authHandler.Logout)
	}

	// 需要鉴权的路由
	api := r.Group("/api/platform")
	api.Use(middleware.AuthMiddleware(authService))
	{
		// 客户
		api.GET("/customers", customerHandler.List)
		api.POST("/customers", customerHandler.Create)
		api.PATCH("/customers/:id", customerHandler.Update)
		api.DELETE("/customers/:id", customerHandler.Delete)

		// 订单
		api.GET("/orders", orderHandler.List)
		api.POST("/orders", orderHandler.Create)
		api.PATCH("/orders/:id", orderHandler.Update)
		api.DELETE("/orders/:id", orderHandler.Delete)

		// 工作看板
		api.GET("/dashboard/items", orderHandler.GetDashboardItems)

		// 订单项
		api.PATCH("/order-items/:itemId", itemHandler.Update)

		// 工序
		api.PATCH("/order-items/:itemId/processes/:processId", processHandler.Update)

		// 材料
		api.GET("/materials", materialHandler.List)
		api.POST("/materials", materialHandler.Create)

		// 余料
		api.GET("/remnants", remnantHandler.List)
		api.POST("/remnants", remnantHandler.Create)

		// 财务
		api.GET("/finance/reconciliation", financeHandler.GetReconciliation)

		// 预警规则
		api.GET("/advent-rules", adventRuleHandler.List)
		api.POST("/advent-rules", adventRuleHandler.Create)
		api.PATCH("/advent-rules/:id", adventRuleHandler.Update)
		api.DELETE("/advent-rules/:id", adventRuleHandler.Delete)
	}

	// 启动服务器
	log.Printf("Go server running on :%d", cfg.ServerPort)
	if err := r.Run(fmt.Sprintf(":%d", cfg.ServerPort)); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
