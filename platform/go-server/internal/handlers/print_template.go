package handlers

import (
	"errors"
	"log"
	"machining-erp/internal/models"
	"machining-erp/internal/repository"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PrintTemplateHandler struct {
	repo *repository.PrintTemplateRepository
}

func NewPrintTemplateHandler(repo *repository.PrintTemplateRepository) *PrintTemplateHandler {
	return &PrintTemplateHandler{repo: repo}
}

func (h *PrintTemplateHandler) List(c *gin.Context) {
	corpID := c.GetInt64("corpID")
	name := c.Query("name")

	templates, err := h.repo.List(corpID, name)
	if err != nil {
		log.Printf("List print templates error: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"data": templates})
}

func (h *PrintTemplateHandler) Create(c *gin.Context) {
	corpID := c.GetInt64("corpID")
	log.Printf("Create print template, corpID: %d", corpID)

	var req models.PrintTemplate
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Bind JSON error: %v", err)
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// 校验模板名称唯一性
	existing, err := h.repo.FindByName(corpID, req.Name)
	if err == nil && existing != nil {
		c.JSON(400, gin.H{"error": "模板名称已存在"})
		return
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Printf("Check name uniqueness error: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Print template request: %+v", req)
	req.CorpID = corpID
	if err := h.repo.Create(&req); err != nil {
		log.Printf("Create print template error: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"id": req.ID})
}

func (h *PrintTemplateHandler) Update(c *gin.Context) {
	corpID := c.GetInt64("corpID")
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req models.PrintTemplate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// 校验模板名称唯一性（排除自身）
	existing, err := h.repo.FindByName(corpID, req.Name)
	if err == nil && existing != nil && existing.ID != id {
		c.JSON(400, gin.H{"error": "模板名称已存在"})
		return
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Printf("Check name uniqueness error: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	req.ID = id
	req.CorpID = corpID
	if err := h.repo.Update(&req); err != nil {
		log.Printf("Update print template error: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"success": true})
}

func (h *PrintTemplateHandler) Delete(c *gin.Context) {
	corpID := c.GetInt64("corpID")
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	if err := h.repo.Delete(corpID, id); err != nil {
		log.Printf("Delete print template error: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"success": true})
}