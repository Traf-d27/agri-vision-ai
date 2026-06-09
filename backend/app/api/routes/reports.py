import io
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.db.session import get_db
from app.api.routes.analytics import get_filtered_df, get_filter_params
from app.services.report_service import generate_excel_report, generate_pdf_report

router = APIRouter()

@router.get("/excel")
def export_excel(db: Session = Depends(get_db), filters: Dict[str, Any] = Depends(get_filter_params)):
    df = get_filtered_df(db, filters)
    if df.empty:
        raise HTTPException(status_code=400, detail="No farm records matching filters.")
        
    records = df.to_dict(orient='records')
    excel_bytes = generate_excel_report(records)
    
    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=agri_intel_report.xlsx"}
    )

@router.post("/pdf")
def export_pdf(
    stats: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    filters: Dict[str, Any] = Depends(get_filter_params)
):
    df = get_filtered_df(db, filters)
    records = df.to_dict(orient='records')
    
    pdf_bytes = generate_pdf_report(records, stats)
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=agri_intel_report.pdf"}
    )
