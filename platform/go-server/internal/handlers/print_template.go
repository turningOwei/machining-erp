package handlers

import (
	"bytes"
	"fmt"
	"log"
	"machining-erp/internal/models"
	"machining-erp/internal/repository"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
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

// FindByButtonKey 根据按钮标识查询模板
func (h *PrintTemplateHandler) FindByButtonKey(c *gin.Context) {
	corpID := c.GetInt64("corpID")
	menuRoute := c.Query("menu_route")
	buttonKey := c.Query("button_key")

	if menuRoute == "" || buttonKey == "" {
		c.JSON(400, gin.H{"error": "缺少menu_route或button_key参数"})
		return
	}

	template, err := h.repo.FindByButtonKey(corpID, menuRoute, buttonKey)
	if err != nil {
		if strings.Contains(err.Error(), "record not found") {
			c.JSON(404, gin.H{"error": "未找到绑定的模板"})
			return
		}
		log.Printf("Find template by button key error: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"data": template})
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
	if err != nil && !strings.Contains(err.Error(), "record not found") {
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

	// 使用map接收部分更新字段
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// 如果更新name，校验模板名称唯一性（排除自身）
	if name, ok := req["name"].(string); ok && name != "" {
		existing, err := h.repo.FindByName(corpID, name)
		if err == nil && existing != nil && existing.ID != id {
			c.JSON(400, gin.H{"error": "模板名称已存在"})
			return
		}
		if err != nil && !strings.Contains(err.Error(), "record not found") {
			log.Printf("Check name uniqueness error: %v", err)
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
	}

	// 部分更新
	if err := h.repo.PartialUpdate(corpID, id, req); err != nil {
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

// ImportExcel 导入Excel文件（前端用Excel.js处理HTML）
func (h *PrintTemplateHandler) ImportExcel(c *gin.Context) {
	corpID := c.GetInt64("corpID")
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	// 获取上传的文件
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "请上传Excel文件"})
		return
	}

	// 检查文件扩展名
	ext := strings.ToLower(file.Filename)
	if !strings.HasSuffix(ext, ".xlsx") && !strings.HasSuffix(ext, ".xls") {
		c.JSON(400, gin.H{"error": "只支持xlsx或xls格式的Excel文件"})
		return
	}

	// 打开文件
	f, err := file.Open()
	if err != nil {
		c.JSON(500, gin.H{"error": "打开文件失败"})
		return
	}
	defer f.Close()

	// 读取文件内容到内存（用于保存原始Excel）
	buf := new(bytes.Buffer)
	buf.ReadFrom(f)
	excelData := buf.Bytes()

	// 使用前端发送的HTML（Excel.js生成）
	html := c.PostForm("html")
	if html == "" {
		c.JSON(400, gin.H{"error": "前端未生成HTML预览"})
		return
	}

	// 只更新Excel相关字段（template, excel_data, excel_filename）
	if err := h.repo.UpdateExcelData(corpID, id, html, excelData, file.Filename); err != nil {
		log.Printf("Update print template error: %v", err)
		c.JSON(500, gin.H{"error": "保存模板失败"})
		return
	}

	c.JSON(200, gin.H{"success": true, "template": html})
}

// convertExcelToHTML 将Excel转换为HTML表格（保留样式）
func convertExcelToHTML(xlFile *excelize.File) string {
	var html strings.Builder

	// 获取第一个工作表
	sheets := xlFile.GetSheetList()
	if len(sheets) == 0 {
		return ""
	}
	firstSheet := sheets[0]

	// 获取行数和列数
	rows, err := xlFile.GetRows(firstSheet)
	if err != nil || len(rows) == 0 {
		return ""
	}

	// 获取样式表，分析边框样式
	stylesMap := make(map[int]bool) // 记录哪些styleID被使用
	for rowIdx, row := range rows {
		for colIdx := range row {
			cellName, _ := excelize.CoordinatesToCellName(colIdx+1, rowIdx+1)
			styleID, _ := xlFile.GetCellStyle(firstSheet, cellName)
			if styleID > 0 {
				stylesMap[styleID] = true
			}
		}
	}

	// 输出样式分析日志
	log.Printf("=== Excel样式分析 ===")
	log.Printf("工作表: %s, 行数: %d", firstSheet, len(rows))
	log.Printf("使用的样式ID数量: %d", len(stylesMap))
	for styleID := range stylesMap {
		style, err := xlFile.GetStyle(styleID)
		if err == nil {
			log.Printf("StyleID %d: Border=%+v, Alignment=%+v", styleID, style.Border, style.Alignment)
		}
	}
	log.Printf("=====================")

	// 获取合并单元格信息
	mergedCells, _ := xlFile.GetMergeCells(firstSheet)
	mergedMap := make(map[string]bool)
	mergeSpanMap := make(map[string][2]int) // [colSpan, rowSpan]

	for _, mc := range mergedCells {
		startCol, startRow, _ := excelize.CellNameToCoordinates(mc.GetStartAxis())
		endCol, endRow, _ := excelize.CellNameToCoordinates(mc.GetEndAxis())
		colSpan := endCol - startCol + 1
		rowSpan := endRow - startRow + 1

		for r := startRow; r <= endRow; r++ {
			for c := startCol; c <= endCol; c++ {
				cellName, _ := excelize.CoordinatesToCellName(c, r)
				if r != startRow || c != startCol {
					mergedMap[cellName] = true // 被合并的单元格，跳过
				} else {
					mergeSpanMap[cellName] = [2]int{colSpan, rowSpan}
				}
			}
		}
	}

	// CSS样式 - 边框由单元格样式控制
	html.WriteString(`<style>
		.excel-table { border-collapse: collapse; width: 100%; }
		.excel-table td { padding: 4px 8px; }
	</style>`)

	html.WriteString(`<table class="excel-table">`)

	// 获取最大列数
	maxCols := 0
	for _, row := range rows {
		if len(row) > maxCols {
			maxCols = len(row)
		}
	}

	for rowIdx, row := range rows {
		// 获取行高
		rowHeight, err := xlFile.GetRowHeight(firstSheet, rowIdx+1)
		rowStyle := ""
		if err == nil && rowHeight > 0 {
			rowStyle = fmt.Sprintf(" style=\"height: %.1fpt\"", rowHeight)
		}
		html.WriteString(fmt.Sprintf("<tr%s>", rowStyle))

		for colIdx := 1; colIdx <= maxCols; colIdx++ {
			cellName, _ := excelize.CoordinatesToCellName(colIdx, rowIdx+1)

			// 检查是否是被合并的单元格
			if mergedMap[cellName] {
				continue
			}

			// 获取单元格值
			value := ""
			if colIdx <= len(row) {
				value = row[colIdx-1]
			}

			// 获取单元格样式
			styleID, _ := xlFile.GetCellStyle(firstSheet, cellName)
			cellStyle := ""
			if styleID > 0 {
				style, err := xlFile.GetStyle(styleID)
				if err == nil && style != nil {
					// 调试：打印边框信息
					if len(style.Border) > 0 {
						log.Printf("Cell %s border: %+v", cellName, style.Border)
					}
					cellStyle = buildCellStyle(style)
				}
			}

			// 检查合并单元格跨度
			spanAttrs := ""
			if spans, ok := mergeSpanMap[cellName]; ok {
				if spans[0] > 1 {
					spanAttrs += fmt.Sprintf(" colspan=\"%d\"", spans[0])
				}
				if spans[1] > 1 {
					spanAttrs += fmt.Sprintf(" rowspan=\"%d\"", spans[1])
				}
			}

			styleAttr := ""
			if cellStyle != "" {
				styleAttr = fmt.Sprintf(" style=\"%s\"", cellStyle)
			}

			html.WriteString(fmt.Sprintf("<td%s%s>%s</td>", spanAttrs, styleAttr, value))
		}
		html.WriteString("</tr>")
	}

	html.WriteString("</table>")

	return html.String()
}

// buildCellStyle 根据excelize样式构建CSS样式字符串
func buildCellStyle(style *excelize.Style) string {
	var cssParts []string

	// 对齐方式
	if style.Alignment != nil {
		// 水平对齐
		switch style.Alignment.Horizontal {
		case "center":
			cssParts = append(cssParts, "text-align: center")
		case "right":
			cssParts = append(cssParts, "text-align: right")
		case "left":
			cssParts = append(cssParts, "text-align: left")
		}

		// 垂直对齐
		switch style.Alignment.Vertical {
		case "center":
			cssParts = append(cssParts, "vertical-align: middle")
		case "top":
			cssParts = append(cssParts, "vertical-align: top")
		case "bottom":
			cssParts = append(cssParts, "vertical-align: bottom")
		}

		// 自动换行
		if style.Alignment.WrapText {
			cssParts = append(cssParts, "white-space: pre-wrap")
		}
	}

	// 字体
	if style.Font != nil {
		if style.Font.Family != "" {
			cssParts = append(cssParts, fmt.Sprintf("font-family: '%s'", style.Font.Family))
		}
		if style.Font.Size > 0 {
			cssParts = append(cssParts, fmt.Sprintf("font-size: %.1fpt", style.Font.Size))
		}
		if style.Font.Bold {
			cssParts = append(cssParts, "font-weight: bold")
		}
		if style.Font.Italic {
			cssParts = append(cssParts, "font-style: italic")
		}
		if style.Font.Underline != "" {
			cssParts = append(cssParts, "text-decoration: underline")
		}
	}

	// 填充（背景色）
	if style.Fill.Type == "pattern" && len(style.Fill.Color) > 0 {
		cssParts = append(cssParts, fmt.Sprintf("background-color: %s", style.Fill.Color[0]))
	}

	// 边框 - 处理每个方向的边框
	if len(style.Border) > 0 {
		for _, border := range style.Border {
			// border.Style: 0=left, 1=right, 2=top, 3=bottom
			borderStyle := convertBorderStyle(border.Type)
			if borderStyle == "" {
				borderStyle = "1px solid"
			}
			color := border.Color
			if color == "" {
				color = "#000000"
			}
			switch border.Style {
			case 0:
				cssParts = append(cssParts, fmt.Sprintf("border-left: %s %s", borderStyle, color))
			case 1:
				cssParts = append(cssParts, fmt.Sprintf("border-right: %s %s", borderStyle, color))
			case 2:
				cssParts = append(cssParts, fmt.Sprintf("border-top: %s %s", borderStyle, color))
			case 3:
				cssParts = append(cssParts, fmt.Sprintf("border-bottom: %s %s", borderStyle, color))
			}
		}
	}

	return strings.Join(cssParts, "; ")
}

// convertBorderStyle 将Excel边框样式转换为CSS边框样式
func convertBorderStyle(style string) string {
	switch style {
	case "thin":
		return "1px solid"
	case "medium":
		return "2px solid"
	case "thick":
		return "3px solid"
	case "double":
		return "3px double"
	case "dotted":
		return "1px dotted"
	case "dashed":
		return "1px dashed"
	default:
		return "1px solid"
	}
}

// DownloadExcel 下载原始Excel文件
func (h *PrintTemplateHandler) DownloadExcel(c *gin.Context) {
	corpID := c.GetInt64("corpID")
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	template, err := h.repo.FindByID(corpID, id)
	if err != nil {
		c.JSON(404, gin.H{"error": "模板不存在"})
		return
	}

	if len(template.ExcelData) == 0 {
		c.JSON(400, gin.H{"error": "该模板未导入Excel文件"})
		return
	}

	filename := template.ExcelFilename
	if filename == "" {
		filename = "template.xlsx"
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Data(200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", template.ExcelData)
}

// RenderTemplate 渲染模板（替换变量）
func (h *PrintTemplateHandler) RenderTemplate(c *gin.Context) {
	corpID := c.GetInt64("corpID")
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	template, err := h.repo.FindByID(corpID, id)
	if err != nil {
		c.JSON(404, gin.H{"error": "模板不存在"})
		return
	}

	// 渲染模板（替换变量）
	rendered := renderTemplateVars(template.Template, data)

	c.JSON(200, gin.H{"template": rendered})
}

// renderTemplateVars 替换模板中的变量占位符 {{变量名}}
func renderTemplateVars(template string, data map[string]interface{}) string {
	result := template
	for key, value := range data {
		placeholder := fmt.Sprintf("{{%s}}", key)
		result = strings.ReplaceAll(result, placeholder, fmt.Sprint(value))
	}
	return result
}

// GeneratePrintExcel 生成打印Excel（替换变量后下载）
func (h *PrintTemplateHandler) GeneratePrintExcel(c *gin.Context) {
	corpID := c.GetInt64("corpID")
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var data map[string]interface{}
	if err := c.ShouldBindJSON(&data); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	template, err := h.repo.FindByID(corpID, id)
	if err != nil {
		c.JSON(404, gin.H{"error": "模板不存在"})
		return
	}

	if len(template.ExcelData) == 0 {
		c.JSON(400, gin.H{"error": "该模板未导入Excel文件"})
		return
	}

	// 打开原始Excel模板
	xlFile, err := excelize.OpenReader(bytes.NewReader(template.ExcelData))
	if err != nil {
		log.Printf("Open Excel template error: %v", err)
		c.JSON(500, gin.H{"error": "打开模板失败"})
		return
	}
	defer xlFile.Close()

	// 获取第一个工作表
	sheets := xlFile.GetSheetList()
	if len(sheets) == 0 {
		c.JSON(500, gin.H{"error": "模板无工作表"})
		return
	}
	firstSheet := sheets[0]

	// 遍历所有单元格，替换变量占位符
	rows, err := xlFile.GetRows(firstSheet)
	if err != nil {
		c.JSON(500, gin.H{"error": "读取模板失败"})
		return
	}

	for rowIdx, row := range rows {
		for colIdx, cellValue := range row {
			// 检查是否包含变量占位符 {{xxx}}
			if strings.Contains(cellValue, "{{") && strings.Contains(cellValue, "}}") {
				// 替换变量
				newValue := cellValue
				for key, value := range data {
					placeholder := fmt.Sprintf("{{%s}}", key)
					newValue = strings.ReplaceAll(newValue, placeholder, fmt.Sprint(value))
				}
				// 更新单元格
				cellName, _ := excelize.CoordinatesToCellName(colIdx+1, rowIdx+1)
				xlFile.SetCellValue(firstSheet, cellName, newValue)
			}
		}
	}

	// 保存到内存
	buf := new(bytes.Buffer)
	if err := xlFile.Write(buf); err != nil {
		log.Printf("Write Excel error: %v", err)
		c.JSON(500, gin.H{"error": "生成Excel失败"})
		return
	}

	// 生成下载文件名
	filename := template.ExcelFilename
	if filename == "" {
		filename = "print.xlsx"
	}
	// 在文件名中加入时间戳
	ext := ""
	if strings.HasSuffix(filename, ".xlsx") {
		ext = ".xlsx"
		filename = filename[:len(filename)-5]
	} else if strings.HasSuffix(filename, ".xls") {
		ext = ".xls"
		filename = filename[:len(filename)-4]
	}
	filename = fmt.Sprintf("%s_%s%s", filename, strings.ReplaceAll(strings.Split(c.Query("timestamp"), ".")[0], ":", "-"), ext)

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Data(200, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}