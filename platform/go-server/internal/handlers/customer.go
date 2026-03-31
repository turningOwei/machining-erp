package handlers

import (
	"machining-erp/internal/models"
	"machining-erp/internal/repository"
	"strconv"

	"github.com/gin-gonic/gin"
)

type CustomerHandler struct {
	repo *repository.CustomerRepository
}

func NewCustomerHandler(repo *repository.CustomerRepository) *CustomerHandler {
	return &CustomerHandler{repo: repo}
}

func (h *CustomerHandler) List(c *gin.Context) {
	customers, err := h.repo.GetAll()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, customers)
}

func (h *CustomerHandler) Create(c *gin.Context) {
	var req struct {
		Name      string           `json:"name"`
		ShortName string           `json:"short_name"`
		Contacts  []models.Contact `json:"contacts"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if req.Name == "" {
		c.JSON(400, gin.H{"error": "客户名称不能为空"})
		return
	}
	if req.ShortName == "" {
		c.JSON(400, gin.H{"error": "客户简称不能为空"})
		return
	}

	// 检查客户名称是否已存在
	exists, err := h.repo.NameExists(req.Name, 0)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	if exists {
		c.JSON(400, gin.H{"error": "客户名称已存在"})
		return
	}

	id, err := h.repo.Create(req.Name, req.ShortName, req.Contacts)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"id": id})
}

func (h *CustomerHandler) Update(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req struct {
		Name      string           `json:"name"`
		ShortName string           `json:"short_name"`
		Contacts  []models.Contact `json:"contacts"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if req.Name == "" {
		c.JSON(400, gin.H{"error": "客户名称不能为空"})
		return
	}
	if req.ShortName == "" {
		c.JSON(400, gin.H{"error": "客户简称不能为空"})
		return
	}

	// 检查客户名称是否已存在（排除当前客户）
	exists, err := h.repo.NameExists(req.Name, id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	if exists {
		c.JSON(400, gin.H{"error": "客户名称已存在"})
		return
	}

	if err := h.repo.Update(id, req.Name, req.ShortName, req.Contacts); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"success": true})
}

func (h *CustomerHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	if err := h.repo.Delete(id); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"success": true})
}