import openpyxl
from io import BytesIO
from typing import List, Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_excel_report(records: List[Dict[str, Any]]) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "AgriIntel Farm Records"
    
    headers = [
        "Farm ID", "Crop Type", "Farm Area (acres)", "Irrigation Type", 
        "Fertilizer Used (tons)", "Pesticide Used (kg)", "Yield (tons)", 
        "Soil Type", "Season", "Water Usage (m3)", "State", "City", 
        "NDVI", "Crop Health", "Water Stress", "Sustainability Score"
    ]
    ws.append(headers)
    
    for rec in records:
        row = [
            rec.get("farm_id"), rec.get("crop_type"), rec.get("farm_area_acres"), 
            rec.get("irrigation_type"), rec.get("fertilizer_used_tons"), rec.get("pesticide_used_kg"), 
            rec.get("yield_tons"), rec.get("soil_type"), rec.get("season"), 
            rec.get("water_usage_cubic_meters"), rec.get("state"), rec.get("city"), 
            rec.get("ndvi"), rec.get("crop_health"), rec.get("water_stress"), 
            rec.get("sustainability_score")
        ]
        ws.append(row)
        
    out = BytesIO()
    wb.save(out)
    return out.getvalue()

def generate_pdf_report(records: List[Dict[str, Any]], stats: Dict[str, Any]) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=colors.HexColor('#1b4332'),
        spaceAfter=15
    )
    heading_style = ParagraphStyle(
        'HeadingStyle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=16,
        textColor=colors.HexColor('#2d6a4f'),
        spaceBefore=10,
        spaceAfter=10
    )
    body_style = styles['Normal']
    
    story = []
    
    story.append(Paragraph("AgriIntel AI - Executive Insights Report", title_style))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("Executive Summary", heading_style))
    overview_text = (
        f"This report presents dynamic agronomic insights compiled from <b>{stats.get('totalFarms', 0)}</b> monitored farm records. "
        f"Global average yield matches <b>{stats.get('avgYield', 0.0):.2f} tons</b> with an average water footprint of <b>{stats.get('avgWater', 0.0):,.1f} m³</b>. "
        f"The most resource-efficient crop across active districts is <b>{stats.get('bestCrop', 'N/A')}</b>, and the benchmark sustainability index stands at <b>{stats.get('avgSustScore', 0.0):.1f}/100</b>."
    )
    story.append(Paragraph(overview_text, body_style))
    story.append(Spacer(1, 15))
    
    story.append(Paragraph("Key Performance Metrics Summary", heading_style))
    table_data = [
        ["Metric Indicator", "Benchmark Value", "Operational Class"],
        ["Total Active Farms", f"{stats.get('totalFarms', 0)}", "Monitored Units"],
        ["Average Productivity Yield", f"{stats.get('avgYield', 0.0):.2f} tons", "Production Load"],
        ["Average Water Footprint", f"{stats.get('avgWater', 0.0):,.1f} m³", "Resource Draw"],
        ["Ecology Sustainability Index", f"{stats.get('avgSustScore', 0.0):.1f}/100", "Environmental Health"],
        ["Optimal Soil Affinity", f"{stats.get('bestSoil', 'N/A')}", "Pedological Match"],
        ["Optimal Harvest Season", f"{stats.get('bestSeason', 'N/A')}", "Seasonal Cycle"]
    ]
    t = Table(table_data, colWidths=[200, 150, 150])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1b4332')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f4f6f5')),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#d8e2dc')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('FONTSIZE', (0,1), (-1,-1), 9),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))
    
    story.append(Paragraph("Data-Driven AI Insights & Directives", heading_style))
    for idx, rec_item in enumerate(stats.get('recommendations', [])[:3]):
        rec_title = f"{idx+1}. {rec_item.get('title')} ({rec_item.get('urgency').upper()} priority)"
        story.append(Paragraph(f"<b>{rec_title}</b>: {rec_item.get('description')}", body_style))
        story.append(Spacer(1, 5))
        
    doc.build(story)
    return buffer.getvalue()
