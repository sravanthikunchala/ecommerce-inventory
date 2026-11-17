import base64
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from email.utils import parsedate
from gettext import translation
import io
from django.db import transaction 

from venv import logger
from django.views.decorators.csrf import csrf_exempt 
from django.http import JsonResponse 
import json
from collections import defaultdict
import calendar
from django.db.models import Count
from django.db.models import Q, Sum, F, Avg, Min, Max
from django.db.models.functions import TruncWeek, TruncMonth, TruncYear, TruncDay

import re
import difflib
from openpyxl import load_workbook

from .models import (DailyInventoryReport, MaterialReceipt, POPayment, PurchaseOrder, Role, PavamanAdminDetails, OverallStock, OrderProducts, ProductStock, ProductsDetails, 
                     MaterialItem, WIP, MaterialTransferNote, MaterialRejectionNote, RejectedMaterialStock,RejectedItem,StoresIssueNote, MaterialDispatchAdvice)
import logging
from io import BytesIO
from django.http import JsonResponse, HttpResponse 
from openpyxl import Workbook 
from .models import MaterialReceipt

from django.utils import timezone  
import openpyxl 
import pandas as pd 
from django.db import models
from django.db.models import F
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.template.loader import render_to_string
from django.core.mail import EmailMessage
from xhtml2pdf import pisa
from io import BytesIO
from decimal import Decimal

@csrf_exempt
def add_material_receipt(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        data = json.loads(request.body)

        
        required_fields = [
            "part_number", "hsn_code", "component_name", "supplier",
            "invoice_no", "invoice_date", "po_no", "po_date",
            "uom", "quantity", "unit_price", "total_price", "taxes", "role_id"
        ]
        missing_fields = [f for f in required_fields if f not in data or data[f] in [None, ""]]
        if missing_fields:
            return JsonResponse({"error": f"Missing or empty fields: {', '.join(missing_fields)}"}, status=400)

        
        try:
            role = Role.objects.get(id=data["role_id"])
        except Role.DoesNotExist:
            return JsonResponse({"error": "Role not found"}, status=404)

        allowed_roles = ["Admin", "Stores Incharge", "Quality Incharge"]
        if role.role_type.strip().title() not in allowed_roles:
            return JsonResponse({"error": "Access denied. Only Admin, Stores Incharge, or Quality Incharge can use this."}, status=403)

        
        if MaterialReceipt.objects.filter(part_number=data["part_number"], invoice_no=data["invoice_no"]).exists():
            return JsonResponse({
                "success": False,
                "message": f"Duplicate material receipt found for Part Number '{data['part_number']}' and Invoice No '{data['invoice_no']}'."
            }, status=400)

        
        admin = None
        if "admin_id" in data:
            try:
                admin = PavamanAdminDetails.objects.get(id=data["admin_id"])
            except PavamanAdminDetails.DoesNotExist:
                return JsonResponse({"error": "Admin not found"}, status=404)
        else:
            
            admin = PavamanAdminDetails.objects.first()

        
        stores_incharge = role.id if role.role_type.lower() == "stores incharge" else None
        quality_incharge = role.id if role.role_type.lower() == "quality incharge" else None

        
        accepted_quantity = data.get("accepted_quantity", 0)
        rejected_quantity = data.get("rejected_quantity", 0)
        status = data.get("status")

        
        receipt = MaterialReceipt.objects.create(
            admin=admin,
            role=role,
            part_number=data["part_number"],
            hsn_code=data["hsn_code"],
            component_name=data["component_name"],
            supplier=data["supplier"],
            invoice_no=data["invoice_no"],
            invoice_date=data["invoice_date"],
            po_no=data["po_no"],
            po_date=data["po_date"],
            uom=data["uom"],
            quantity=data["quantity"],
            unit_price=data["unit_price"],
            total_price=data["total_price"],
            taxes=data["taxes"],
            stores_incharge=stores_incharge,
            quality_incharge=quality_incharge,
            accepted_quantity=accepted_quantity,
            rejected_quantity=rejected_quantity,
            status=status
        )

        
        response_data = {
            "id": receipt.id,
            "part_number": receipt.part_number,
            "hsn_code": receipt.hsn_code,
            "component_name": receipt.component_name,
            "supplier": receipt.supplier,
            "invoice_no": receipt.invoice_no,
            "invoice_date": str(receipt.invoice_date),
            "po_no": receipt.po_no,
            "po_date": str(receipt.po_date),
            "uom": receipt.uom,
            "quantity": receipt.quantity,
            "unit_price": str(receipt.unit_price),
            "total_price": str(receipt.total_price),
            "taxes": str(receipt.taxes),
            "role_id": receipt.role.id if receipt.role else None,
            "admin_id": receipt.admin.id if receipt.admin else None,
            "stores_incharge": receipt.stores_incharge,
            "quality_incharge": receipt.quality_incharge,
            "accepted_quantity": receipt.accepted_quantity,
            "rejected_quantity": receipt.rejected_quantity,
            "inspection_status": receipt.inspection_status,
            "status": receipt.status,
            "created_at": receipt.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }

        return JsonResponse({
            "success": True,
            "message": "Material receipt added successfully.",
            "data": response_data
        })

    except Exception as e:
        return JsonResponse({"error": f"An unexpected error occurred: {str(e)}"}, status=500)



    
@csrf_exempt
def view_material_receipts(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)
    
    try:
        data = json.loads(request.body or "{}")
        role_id = data.get("role_id")

        
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            return JsonResponse({"error": "Role not found"}, status=404)

        
        receipts = MaterialReceipt.objects.all()

        receipt_list = []
        for receipt in receipts:

            role = getattr(receipt, "role", None)

            receipt_list.append({
                "id": receipt.id,
                "part_number": receipt.part_number,
                "hsn_code": receipt.hsn_code,
                "component_name": receipt.component_name,
                "supplier": receipt.supplier,
                "invoice_no": receipt.invoice_no,
                "invoice_date": str(receipt.invoice_date) if receipt.invoice_date else None,
                "po_no": receipt.po_no,
                "po_date": str(receipt.po_date) if receipt.po_date else None,
                "uom": receipt.uom,
                "quantity": receipt.quantity,
                "unit_price": str(receipt.unit_price) if receipt.unit_price else None,
                "total_price": str(receipt.total_price) if receipt.total_price else None,
                "taxes": str(receipt.taxes) if receipt.taxes else None,
                "inspection_status": receipt.inspection_status,

                
                "role_id": role.id if role else None,
                "role_type": role.role_type if role else None,

                
                "accepted_quantity": getattr(receipt, "accepted_quantity", None),
                "rejected_quantity": getattr(receipt, "rejected_quantity", None),
                "created_at": receipt.created_at.strftime("%Y-%m-%d %H:%M:%S") if receipt.created_at else None,
            })

        return JsonResponse({
            "success": True,
            "message": "Material receipts retrieved successfully.",
            "total_records": receipts.count(),
            "data": receipt_list
        }, status=200)

    except Exception as e:
        return JsonResponse({"error": f"An unexpected error occurred: {str(e)}"}, status=500)




@csrf_exempt
def inspect_material(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    if len(request.body) > 1024 * 1024: 
        return JsonResponse({"error": "Request payload too large."}, status=400)

    try:
        data = json.loads(request.body)
        role_id = data.get("role_id")
        ids_data = data.get("ids")

        if not role_id or not ids_data:
            return JsonResponse({"error": "Fields 'ids' and 'role_id' are required."}, status=400)

       
        role = Role.objects.filter(id=role_id).only("id", "role_type").first()
        if not role:
            return JsonResponse({"error": "Role not found"}, status=404)
        if role.role_type.lower() not in ["quality incharge","admin"]:
            return JsonResponse({"error": "Only Quality Incharge or Admin can perform inspection."}, status=403)

        
        ids_list = [i["id"] for i in ids_data]
        receipts = list(MaterialReceipt.objects.filter(id__in=ids_list))

        if not receipts:
            return JsonResponse({"error": "No valid material receipts found."}, status=404)

        receipt_map = {r.id: r for r in receipts}
        updated_records = []
        stock_data = {}  

        
        quality_incharge = Role.objects.filter(role_type__iexact="quality incharge").first()
        quality_incharge_id = quality_incharge.id if quality_incharge else None

        for item in ids_data:
            rid = item.get("id")
            receipt = receipt_map.get(rid)
            if not receipt:
                continue

            accepted_qty = int(item.get("accepted_quantity", 0))
            rejected_qty = int(item.get("rejected_quantity", 0))

            if accepted_qty + rejected_qty != receipt.quantity:
                return JsonResponse({"error": f"Accepted + Rejected must match total quantity for ID {rid}."}, status=400)

            
            receipt.accepted_quantity = accepted_qty
            receipt.rejected_quantity = rejected_qty
            receipt.inspection_status = "completed"
            receipt.updated_at = timezone.now()
            receipt.role_id = role_id  
            receipt.quality_incharge = quality_incharge_id  

            
            key = (receipt.component_name, receipt.uom)
            if key not in stock_data:
                stock_data[key] = {"accepted_qty": 0, "unit_price": float(receipt.unit_price)}
            stock_data[key]["accepted_qty"] += accepted_qty

            
            updated_records.append({
                "id": receipt.id,
                "component_name": receipt.component_name,
                "quantity": receipt.quantity,
                "accepted_quantity": accepted_qty,
                "rejected_quantity": rejected_qty,
                "unit_price": float(receipt.unit_price),
                "inspection_status": "completed",
                "role_id": receipt.role_id,
                "quality_incharge": receipt.quality_incharge,
                "updated_at": receipt.updated_at.strftime("%Y-%m-%d %H:%M:%S")
            })

        
        with transaction.atomic():
            MaterialReceipt.objects.bulk_update(
                receipts,
                [
                    "accepted_quantity", 
                    "rejected_quantity", 
                    "inspection_status", 
                    "updated_at", 
                    "role_id",
                    "quality_incharge"
                ]
            )

            
            comp_names = [k[0] for k in stock_data.keys()]
            uoms = [k[1] for k in stock_data.keys()]
            existing_stocks = {
                (s.component_name, s.uom): s
                for s in OverallStock.objects.filter(component_name__in=comp_names, uom__in=uoms)
            }

            new_stocks = []
            updated_stocks = []

            for (component_name, uom), info in stock_data.items():
                accepted_qty = info["accepted_qty"]
                unit_price = info["unit_price"]
                stock = existing_stocks.get((component_name, uom))
                if stock:
                    stock.total_quantity += accepted_qty
                    stock.average_price = unit_price
                    stock.total_value = stock.total_quantity * unit_price
                    updated_stocks.append(stock)
                else:
                    new_stocks.append(
                        OverallStock(
                            component_name=component_name,
                            uom=uom,
                            total_quantity=accepted_qty,
                            average_price=unit_price,
                            total_value=accepted_qty * unit_price,
                        )
                    )

            if new_stocks:
                OverallStock.objects.bulk_create(new_stocks, ignore_conflicts=True)
            if updated_stocks:
                OverallStock.objects.bulk_update(updated_stocks, ["total_quantity", "average_price", "total_value"])

        
        def stream_response(records):
            yield '{"success": true, "message": "' + f"{len(records)} materials inspected successfully and overall stock updated." + '", "data": ['
            for i, rec in enumerate(records):
                yield json.dumps(rec)
                if i < len(records) - 1:
                    yield ','
            yield ']}'

        return StreamingHttpResponse(stream_response(updated_records), content_type='application/json')

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format."}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)





@csrf_exempt
def view_overall_stock(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        data = json.loads(request.body or "{}")
        role_id = data.get("role_id")

        if not role_id:
            return JsonResponse({"error": "Missing field: role_id"}, status=400)

        # Get role
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            return JsonResponse({"error": "Role not found"}, status=404)

        # Fetch stocks based on role
        if role.role_type.lower() == "admin":
            stocks = OverallStock.objects.all()
        else:
            stocks = OverallStock.objects.filter(
                models.Q(role=role) |
                models.Q(admin__role=role) |
                models.Q(role__isnull=True)
            )

        # Group and aggregate
        grouped_stocks = stocks.values(
            "component_name", "uom", "role__id", "role__role_type"
        ).annotate(
            total_quantity=Sum("total_quantity"),
            average_price=Avg("average_price"),
            total_value=Sum("total_value")
        )

        # Prepare data for response
        data_list = []
        for stock in grouped_stocks:
            role_id_value = stock["role__id"] or role.id
            role_type_value = stock["role__role_type"] or role.role_type

            data_list.append({
                "component_name": stock["component_name"],
                "uom": stock["uom"],
                "total_quantity": stock["total_quantity"],
                "average_price": float(stock["average_price"] or 0),
                "total_value": float(stock["total_value"] or 0),
                "role_id": role_id_value,
                "role_type": role_type_value
            })

        return JsonResponse({
            "success": True,
            "message": "Overall stock retrieved successfully.",
            "total_records": len(data_list),
            "data": data_list
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format."}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)






@csrf_exempt
def view_product_stock(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        stocks = OverallStock.objects.all()

        grouped_stocks = stocks.values(
            "component_name", "uom", "role__id", "role__role_type"
        ).annotate(
            total_quantity=Sum("total_quantity"),
            average_price=Avg("average_price"),
            total_value=Sum("total_value")
        )

        product_stock_map = {
            s.description: s for s in ProductStock.objects.filter(
                description__in=[g['component_name'] for g in grouped_stocks]
            )
        }

        default_role = Role.objects.filter(role_type="quality incharge").first()
        data_list = []

        for stock in grouped_stocks:
            component_name = stock["component_name"]
            ps = product_stock_map.get(component_name)

            if ps:
                gst_amount = ps.gst if ps.gst else (ps.basic_price * Decimal('0.18') if ps.basic_price else 0)
                total_price = ps.qty_in_stock * (ps.basic_price + gst_amount) if ps.basic_price else 0
            else:
                gst_amount = 0
                total_price = 0


            data_list.append({
                "id": ps.id if ps else 0,
                "component_name": component_name,
                "description": ps.description if ps else component_name,
                "specifications": ps.specifications if ps else "",
                "uom": ps.uom if ps else stock["uom"],
                "qty_required_per_drone": ps.qty_required_per_drone if ps else 0,
                "part_number": ps.part_number if ps else "",
                "country_of_origin": ps.country_of_origin if ps else "",
                "qty_in_stock": ps.qty_in_stock if ps else stock["total_quantity"] or 0,
                "basic_price": float(stock["average_price"] or 0),  # Added key
                "total_price": float(stock["total_value"] or 0),    # Added key
                "gst": f"{gst_amount:.2f}",
                
                "remarks": ps.remarks if ps else "",
                "created_at": ps.created_at.strftime("%Y-%m-%d %H:%M:%S") if ps and ps.created_at else "",
            })

        return JsonResponse({
            "success": True,
            "total_records": len(data_list),
            "data": data_list
        }, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)







@csrf_exempt
def add_material_transfer_note(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format."}, status=400)

        required_fields = ["role_id", "items"]
        missing_fields = [f for f in required_fields if f not in data or data[f] in [None, "", []]]
        if missing_fields:
            return JsonResponse({"error": f"Missing or empty fields: {', '.join(missing_fields)}"}, status=400)

        role_ids = [data.get("role_id"), data.get("issued_by_id"), data.get("received_by_id")]
        roles = Role.objects.filter(id__in=[rid for rid in role_ids if rid]).in_bulk()
        role = roles.get(data["role_id"])
        if not role:
            return JsonResponse({"error": "Role not found"}, status=404)

        if role.role_type.lower() not in ["production incharge", "admin"]:
            return JsonResponse({"error": "Access denied. Only Production Incharge or Admin can create MTN."}, status=403)

        last_mtn_no = MaterialTransferNote.objects.filter(mtn_no__startswith="MTN").order_by('-id').values_list('mtn_no', flat=True).first()
        if last_mtn_no:
            try:
                last_no = int(last_mtn_no.replace("MTN", "")) + 1
                new_mtn_no = f"MTN{last_no}"
            except:
                new_mtn_no = "MTN1001"
        else:
            new_mtn_no = "MTN1001"

        def get_role_details(role_obj):
            full_name = f"{role_obj.first_name} {role_obj.last_name}".strip() or (role_obj.email or role_obj.mobile_no)
            return {
                "id": role_obj.id,
                "name": full_name,
                "role_type": role_obj.role_type,
                "display": f"{full_name} ({role_obj.role_type})"
            }

        issued_role = roles.get(data.get("issued_by_id")) or Role.objects.filter(role_type__iexact="stores incharge", status=1).first()
        received_role = roles.get(data.get("received_by_id")) or Role.objects.filter(role_type__iexact="production incharge", status=1).first()
        admin_role = Role.objects.filter(role_type__iexact="admin", status=1).first()

        if not issued_role or not received_role or not admin_role:
            return JsonResponse({"error": "Required roles not found."}, status=404)

        issued_details = get_role_details(issued_role)
        authorized_details = get_role_details(admin_role)  
        received_details = get_role_details(received_role)

        def generate_unique_sin():
            last_id = MaterialItem.objects.aggregate(max_id=Max('id'))['max_id'] or 0
            return f"SIN{last_id + 1:03d}"

        response_items = []

        with transaction.atomic():
            mtn = MaterialTransferNote.objects.create(
                mtn_no=new_mtn_no,
                issued_by=issued_details["display"],
                authorized_by=authorized_details["display"],
                received_by=received_details["display"],
                role=role
            )

            for idx, item in enumerate(data["items"], start=1):
                for field in ["item_name", "uom", "qty_transferred"]:
                    if field not in item or item[field] in [None, ""]:
                        return JsonResponse({"error": f"Missing field '{field}' in item {idx}"}, status=400)

                component = item["item_name"]
                uom = item["uom"]
                qty = Decimal(item["qty_transferred"])
                sin_no = item.get("sin_no")

                if not sin_no or MaterialItem.objects.filter(sin_no=sin_no).exists():
                    sin_no = generate_unique_sin()

                wips = list(WIP.objects.select_for_update()
                            .filter(component_name=component, uom=uom)
                            .order_by('id'))
                if not wips:
                    return JsonResponse({"error": f"{component} not found in WIP"}, status=404)

                total_available = sum(w.quantity for w in wips)
                if total_available < qty:
                    return JsonResponse({"error": f"Not enough WIP stock for {component}"}, status=400)

                remaining_qty = qty
                for wip in wips:
                    deduct = min(wip.quantity, remaining_qty)
                    wip.quantity -= deduct
                    remaining_qty -= deduct
                    if remaining_qty <= 0:
                        break
                WIP.objects.bulk_update(wips, ['quantity'])

                OverallStock.objects.update_or_create(
                    component_name=component, uom=uom,
                    defaults={'total_quantity': 0, 'average_price': 0}
                )
                OverallStock.objects.filter(component_name=component, uom=uom).update(
                    total_quantity=F('total_quantity') + qty,
                    total_value=F('total_quantity') * F('average_price')
                )

                material_item = MaterialItem.objects.create(
                    mtn=mtn,
                    item_name=component,
                    uom=uom,
                    qty_transferred=qty,
                    remarks=item.get("remarks", ""),
                    sin_no=sin_no
                )

                response_items.append({
                    "id": material_item.id,
                    "item_name": material_item.item_name,
                    "uom": material_item.uom,
                    "qty_transferred": str(material_item.qty_transferred),
                    "remarks": material_item.remarks,
                    "sin_no": material_item.sin_no
                })

        response_data = {
            "id": mtn.id,
            "mtn_no": mtn.mtn_no,
            "issued_by": issued_details["display"],
            "issued_by_details": issued_details,
            "authorized_by": authorized_details["display"],
            "authorized_by_details": authorized_details,
            "received_by": received_details["display"],
            "received_by_details": received_details,
            "created_at": mtn.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "role_id": role.id,
            "role_type": role.role_type,
            "role_name": authorized_details["name"],  
            "items": response_items
        }

        return JsonResponse({
            "success": True,
            "message": "Material Transfer Note created successfully.",
            "data": response_data
        }, status=201)

    except Exception as e:
        return JsonResponse({"error": f"An unexpected error occurred: {str(e)}"}, status=500)


    
@csrf_exempt
def view_material_transfer_notes(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        
        mt_notes = list(
            MaterialTransferNote.objects.all()
            .order_by('-id')
            .values('id', 'mtn_no', 'issued_by', 'authorized_by', 'received_by', 'created_at', 'role_id')
        )

       
        mt_ids = [mtn['id'] for mtn in mt_notes]
        items = MaterialItem.objects.filter(mtn_id__in=mt_ids).values(
            'id', 'item_name', 'uom', 'qty_transferred', 'remarks', 'mtn_id'
        )

      
        items_dict = {}
        for item in items:
            items_dict.setdefault(item['mtn_id'], []).append({
                'id': item['id'],
                'item_name': item['item_name'],
                'uom': item['uom'],
                "qty_transferred": str(int(item['qty_transferred'])) if item['qty_transferred'] == item['qty_transferred'].to_integral() else str(item['qty_transferred']),

                'remarks': item['remarks']
            })

        
        for mtn in mt_notes:
            mtn['items'] = items_dict.get(mtn['id'], [])
            mtn['created_at'] = mtn['created_at'].strftime("%Y-%m-%d %H:%M:%S")

        return JsonResponse({
            "success": True,
            "message": "Material Transfer Notes fetched successfully.",
            "data": mt_notes
        }, status=200)

    except Exception as e:
        return JsonResponse({"error": f"An unexpected error occurred: {str(e)}"}, status=500)







@csrf_exempt
def view_wip(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        data = json.loads(request.body)

        
        component_name = data.get("component_name")
        sin_no = data.get("sin_no")
        start_date = data.get("start_date")
        end_date = data.get("end_date")

        wip_queryset = WIP.objects.all()

        if component_name:
            wip_queryset = wip_queryset.filter(component_name__icontains=component_name)
        if sin_no:
            wip_queryset = wip_queryset.filter(sin_no=sin_no)
        if start_date:
            try:
                start_date = timezone.datetime.strptime(start_date, "%Y-%m-%d").date()
                wip_queryset = wip_queryset.filter(issued_date__gte=start_date)
            except ValueError:
                return JsonResponse({"error": "Invalid start_date format. Use YYYY-MM-DD."}, status=400)
        if end_date:
            try:
                end_date = timezone.datetime.strptime(end_date, "%Y-%m-%d").date()
                wip_queryset = wip_queryset.filter(issued_date__lte=end_date)
            except ValueError:
                return JsonResponse({"error": "Invalid end_date format. Use YYYY-MM-DD."}, status=400)

        
        grouped_data = defaultdict(lambda: {"quantity": 0, "records": []})
        for wip in wip_queryset:
            key = wip.component_name
            grouped_data[key]["quantity"] += wip.quantity
            grouped_data[key]["records"].append(wip)

        
        response_data = []
        for component_name, info in grouped_data.items():
            first_record = info["records"][0]
            response_data.append({
                "id": first_record.id,
                "component_name": component_name,
                "uom": first_record.uom,
                "quantity": info["quantity"],  
                "sin_no": first_record.sin_no,
                "issued_date": str(first_record.issued_date),
                "role_id": first_record.role.id if first_record.role else None,
                "created_at": first_record.created_at.strftime("%Y-%m-%d %H:%M:%S")
            })

        return JsonResponse({
            "success": True,
            "count": len(response_data),
            "data": response_data
        })

    except Exception as e:
        return JsonResponse({"error": f"An unexpected error occurred: {str(e)}"}, status=500)




@csrf_exempt
def add_material_rejection_note(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        data = json.loads(request.body)

        
        required_fields = ["mrn_no", "role_id", "items"]
        missing_fields = [f for f in required_fields if f not in data or data[f] in [None, ""]]
        if missing_fields:
            return JsonResponse({"error": f"Missing or empty fields: {', '.join(missing_fields)}"}, status=400)

        
        try:
            role = Role.objects.get(id=data["role_id"])
        except Role.DoesNotExist:
            return JsonResponse({"error": "Role not found"}, status=404)

        
        if role.role_type.strip().lower() not in ["production incharge", "admin"]:
            return JsonResponse({"error": "Access denied. Only Admin or Production Incharge can create MRNs."}, status=403)

        
        def get_role_details(role_obj):
            full_name = f"{role_obj.first_name} {role_obj.last_name}".strip() or (role_obj.email or role_obj.mobile_no)
            return {
                "id": role_obj.id,
                "name": full_name,
                "role_type": role_obj.role_type,
                "display": f"{full_name} ({role_obj.role_type})"
            }

        
        roles = {r.id: r for r in Role.objects.filter(status=1)}

       
        received_role = roles.get(data.get("received_by_id")) or Role.objects.filter(role_type__iexact="stores incharge", status=1).first()
        if not received_role:
            return JsonResponse({"error": "No active Stores Incharge found."}, status=404)
        received_details = get_role_details(received_role)

        

       
        if role.role_type.lower() == "admin":
            
            authorized_role = role
        else:
            
            authorized_role = Role.objects.filter(role_type__iexact="admin", status=1).first() or role
        authorized_details = get_role_details(authorized_role)

        
        issued_role = roles.get(data.get("issued_by_id")) or Role.objects.filter(role_type__iexact="production incharge", status=1).first()
        if not issued_role:
            return JsonResponse({"error": "No active Production Incharge found."}, status=404)
        issued_details = get_role_details(issued_role)

        with transaction.atomic():
            
            mrn = MaterialRejectionNote.objects.create(
                role=role,
                mrn_no=data["mrn_no"],
                issued_by=issued_details["display"],
                received_by=received_details["display"],
            )

            
            items = data["items"]
            if not isinstance(items, list) or not items:
                return JsonResponse({"error": "Items must be a non-empty list"}, status=400)

            created_items = []
            for item in items:
                required_item_fields = ["component_name", "uom", "qty_rejected", "reason"]
                missing_item_fields = [f for f in required_item_fields if f not in item or item[f] in [None, ""]]
                if missing_item_fields:
                    return JsonResponse(
                        {"error": f"Missing or empty fields in item: {', '.join(missing_item_fields)}"}, status=400
                    )

                rejected_item = RejectedItem.objects.create(
                    mrn=mrn,
                    component_name=item["component_name"],
                    uom=item["uom"],
                    qty_rejected=item["qty_rejected"],
                    reason=item["reason"]
                )

                
                stock, _ = RejectedMaterialStock.objects.get_or_create(
                    component_name=item["component_name"],
                    uom=item["uom"],
                    role=role,
                    defaults={"qty_in_stock": 0, "value": 0}
                )
                stock.qty_in_stock += item["qty_rejected"]
                stock.value = 0
                stock.save()

                created_items.append({
                    "id": rejected_item.id,
                    "component_name": rejected_item.component_name,
                    "uom": rejected_item.uom,
                    "qty_rejected": rejected_item.qty_rejected,
                    "reason": rejected_item.reason,
                })

            return JsonResponse({
                "success": True,
                "message": "Material Rejection Note created successfully.",
                "data": {
                    "id": mrn.id,
                    "mrn_no": mrn.mrn_no,
                    "issued_by": issued_details,
                    "authorized_by": authorized_details,
                    "received_by": received_details,
                    "created_at": mrn.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "role_id": role.id,
                    "items": created_items
                }
            }, status=201)

    except Exception as e:
        return JsonResponse({"error": f"An unexpected error occurred: {str(e)}"}, status=500)




@csrf_exempt
def view_material_rejection_notes(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        
        mrn_queryset = MaterialRejectionNote.objects.all().order_by('-created_at')

        if not mrn_queryset.exists():
            return JsonResponse({
                "success": False,
                "message": "No Material Rejection Notes found.",
                "data": [],
                "stats": {
                    "total_records": 0,
                    "total_qty_rejected": 0,
                    "with_remarks": 0,
                    "last_entry": None
                }
            }, status=200)

        result = []
        total_qty_rejected = 0
        with_remarks_count = 0

        for mrn in mrn_queryset:
            items = RejectedItem.objects.filter(mrn=mrn)
            item_data = [
                {
                    "id": item.id,
                    "component_name": item.component_name,
                    "uom": item.uom,
                    "qty_rejected": item.qty_rejected,
                    "reason": item.reason,
                }
                for item in items
            ]

           
            for item in items:
                total_qty_rejected += item.qty_rejected
                if item.reason and item.reason.strip() != "":
                    with_remarks_count += 1

            result.append({
                "id": mrn.id,
                "mrn_no": mrn.mrn_no,
                "issued_by": mrn.issued_by,
                "received_by": mrn.received_by,
                "created_at": mrn.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "role_id": mrn.role.id if mrn.role else None,
                "items": item_data
            })

        last_entry_mrn = next((mrn for mrn in mrn_queryset if RejectedItem.objects.filter(mrn=mrn).exists()), None)
        last_entry_date = last_entry_mrn.created_at.strftime("%Y-%m-%d %H:%M:%S") if last_entry_mrn else None

        return JsonResponse({
            "success": True,
            "message": "Material Rejection Notes retrieved successfully.",
            "data": result,
            "stats": {
                "total_records": len([mrn for mrn in result if mrn['items']]),
                "total_qty_rejected": total_qty_rejected,
                "with_remarks": with_remarks_count,
                "last_entry": last_entry_date
            }
        }, status=200)

    except Exception as e:
        return JsonResponse({"error": f"An unexpected error occurred: {str(e)}"}, status=500)




@csrf_exempt
def create_sin(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body)
        role_id = data.get("role_id")
        component_name = data.get("component_name")
        uom = data.get("uom")
        qty_requested = int(data.get("qty_requested", 0))
        remarks = data.get("remarks", "")

        if not all([role_id, component_name, uom, qty_requested]):
            return JsonResponse({"success": False, "message": "All fields required"}, status=400)

        role = Role.objects.filter(id=role_id).first()
        if not role:
            return JsonResponse({"success": False, "message": "Role not found"}, status=404)

        if role.role_type.lower() not in ["admin", "production incharge"]:
            return JsonResponse({
                "success": False,
                "message": "Only Admin or Production Incharge can create SIN"
            }, status=403)

       
        def get_role_details(role_obj):
            full_name = f"{role_obj.first_name} {role_obj.last_name}".strip() or (role_obj.email or role_obj.mobile_no)
            return {
                "id": role_obj.id,
                "name": full_name,
                "role_type": role_obj.role_type,
                "display": f"{full_name} ({role_obj.role_type})"
            }

        roles = {r.id: r for r in Role.objects.filter(status=1)}

        
        issued_role = roles.get(data.get("issued_by_id")) or Role.objects.filter(
            role_type__iexact="stores incharge", status=1
        ).first()
        if not issued_role:
            return JsonResponse({"error": "No active Stores Incharge found."}, status=404)
        issued_details = get_role_details(issued_role)

       
        if role.role_type.lower() == "admin":
            authorized_role = role
        else:
            authorized_role = Role.objects.filter(role_type__iexact="admin", status=1).first() or role
        authorized_details = get_role_details(authorized_role)

        
        received_role = roles.get(data.get("received_by_id")) or Role.objects.filter(
            role_type__iexact="production incharge", status=1
        ).first()
        if not received_role:
            return JsonResponse({"error": "No active Production Incharge found."}, status=404)
        received_details = get_role_details(received_role)

       
        sin_no = f"SIN-{StoresIssueNote.objects.count() + 1}"

        sin = StoresIssueNote.objects.create(
            role=role,
            component_name=component_name,
            uom=uom,
            qty_requested=qty_requested,
            qty_issued=0,
            balance=qty_requested,
            remarks=remarks,
            sin_no=sin_no,
            date=timezone.now().date(),
            issued_by=issued_details["display"],
            authorized_by=authorized_details["display"],
            received_by=received_details["display"],
            stores_ic=issued_details["display"],
            unit_price_at_issue=0,  
            issued_date=timezone.now().date()  
        )

        return JsonResponse({
            "success": True,
            "message": "SIN created successfully",
            "sin_no": sin.sin_no,
            "issued_by": issued_details,
            "authorized_by": authorized_details,
            "received_by": received_details,
        }, status=200)

    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)
    
@csrf_exempt
def update_sin(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body)
        role_id = data.get("role_id")
        sin_no = data.get("sin_no")
        additional_qty = int(data.get("qty_issued", 0))
        stores_ic = data.get("stores_ic", "Updated")

        role = Role.objects.filter(id=role_id).first()
        if not role:
            return JsonResponse({"success": False, "message": "Role not found"}, status=404)

        if role.role_type.lower() not in ["admin", "stores incharge"]:
            return JsonResponse({"success": False, "message": "Only Admin or Stores Incharge can update SIN"}, status=403)

        sin = StoresIssueNote.objects.filter(sin_no=sin_no).first()
        if not sin:
            return JsonResponse({"success": False, "message": "SIN not found"}, status=404)

        if additional_qty <= 0:
            return JsonResponse({"success": False, "message": "Issued quantity must be positive"}, status=400)

        if (sin.qty_issued + additional_qty) > sin.qty_requested:
            return JsonResponse({
                "success": False, 
                "message": f"Cannot issue more than requested quantity. Already issued: {sin.qty_issued}, Requested: {sin.qty_requested}, Additional: {additional_qty} would exceed limit"
            }, status=400)

        stock = OverallStock.objects.filter(component_name=sin.component_name, uom=sin.uom).first()
        if not stock:
            return JsonResponse({"success": False, "message": f"No stock found for {sin.component_name} ({sin.uom})"}, status=404)

        if additional_qty > stock.total_quantity:
            return JsonResponse({
                "success": False, 
                "message": f"Not enough stock to issue. Available: {stock.total_quantity}, Requested additional: {additional_qty}"
            }, status=400)

        if not sin.unit_price_at_issue:
            sin.unit_price_at_issue = stock.average_price

        stock.total_quantity -= additional_qty
        stock.total_value = stock.average_price * stock.total_quantity
        stock.save()

        WIP.objects.create(
            admin=sin.admin,
            role=sin.role,
            component_name=sin.component_name,
            uom=sin.uom,
            quantity=additional_qty,
            sin_no=sin.sin_no,
            issued_date=timezone.now().date()
        )

        sin.qty_issued += additional_qty
        sin.balance = sin.qty_requested - sin.qty_issued
        sin.issued_date = timezone.now().date() 
        sin.stores_ic = stores_ic
        
        sin.save()

        update_or_create_daily_report(timezone.now().date())

        return JsonResponse({
            "success": True,
            "message": f"Successfully issued {additional_qty} items. Total issued: {sin.qty_issued}, Balance: {sin.balance}",
            "sin_no": sin.sin_no,
            "additional_qty_issued": additional_qty,
            "total_qty_issued": sin.qty_issued,
            "balance": sin.balance,
            "unit_price_at_issue": float(sin.unit_price_at_issue) 
        }, status=200)

    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)

@csrf_exempt
def view_sin(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid method"}, status=405)

    try:
        
        sins = StoresIssueNote.objects.select_related("role").order_by("-id")

        data = [
            {
                "sin_no": sin.sin_no,
                "component_name": sin.component_name,
                "uom": sin.uom,
                "qty_requested": sin.qty_requested,
                "qty_issued": sin.qty_issued,
                "balance": sin.balance,
                "remarks": sin.remarks,
                "issued_by": sin.issued_by,
                "authorized_by": sin.authorized_by,
                "stores_ic": sin.stores_ic,
                "received_by": sin.received_by,
                "created_by": sin.role.first_name if sin.role else "N/A",
                "role_type": sin.role.role_type if sin.role else "N/A",
                "created_on": sin.created_at.strftime("%Y-%m-%d %H:%M"),
            }
            for sin in sins
        ]

        return JsonResponse({"success": True, "data": data}, status=200)

    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)




@csrf_exempt
def add_mda(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed."}, status=405)

    try:
        data = json.loads(request.body)
        po_id = data.get("po_id")
        role_id = data.get("role_id")
        remarks = data.get("remarks", "")

        role = Role.objects.get(id=role_id)

        if role.role_type.lower() != "finance":
            return JsonResponse({"error": "Only Finance role can add MDA"}, status=403)
    
        if not all([po_id, role_id]):
            return JsonResponse({"error": "Missing purchase_order_id or prepared_by"}, status=400)

        po = PurchaseOrder.objects.get(id=po_id)
        role = Role.objects.get(id=role_id)
        
       
        if not po:
            return JsonResponse({"error": "Invalid Purchase Order ID."}, status=400)


        if po.payment_status.lower() != "fully paid":
            return JsonResponse({"error": "PO payment not fully completed"}, status=400)
        
        dispatch_status = "Pending"
     
        mda_no = f"MDA-{timezone.now().strftime('%Y%m%d')}-{MaterialDispatchAdvice.objects.count()+1:03d}"
        mda = MaterialDispatchAdvice.objects.create(
            mda_no=mda_no,
            purchase_order=po,
            remarks=remarks,
            prepared_by=role,
            dispatch_status=dispatch_status
        )

        return JsonResponse({
            "success": True,
            "message": "MDA created successfully.",
            "data": {
                "mda_no": mda.mda_no,
                "po_number": po.po_number,
                "customer_name": po.customer_name,
                "product_name": po.product_name,
                "quantity": po.quantity,
                "total_order_value": float(po.total_value),
                "payment_received": float(po.payment_received),
                "payment_status": po.payment_status,
                "dispatch_status": mda.dispatch_status,
                "created_at": mda.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "prepared_by": mda.prepared_by.first_name,  
                "prepared_by_id": mda.prepared_by.id,      
            }
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def view_mda(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        mda_list = MaterialDispatchAdvice.objects.all().order_by("-created_at")
        request_data  = json.loads(request.body)
        role_id = request_data .get("role_id")

        role = Role.objects.get(id=role_id)

       
        
        if role.role_type.lower() == "stores incharge":
            
            mda_list = mda_list.filter(dispatch_status__in=["Ready to Dispatch", "Ready for Shipment"])

        elif role.role_type.lower() == "finance":
           
            pass

        elif role.role_type.lower() == "admin":
            
            pass

        else:
            return JsonResponse({"error": "Access denied for this role."}, status=403)
        data =[]
        for mda in mda_list:
            po = mda.purchase_order  

            if po:
                
                balance_amount = float(po.total_value) - float(po.payment_received)

                data.append({
                    "mda_id": mda.id,
                    "mda_no": mda.mda_no,
                    "date": mda.dispatch_date.strftime("%Y-%m-%d"),
                    "customer_name": po.customer_name,
                    "product_name": po.product_name,
                    "quantity": po.quantity,
                    "total_value": float(po.total_value),
                    "payment_received": float(po.payment_received),
                    "balance": round(balance_amount, 2),
                    "remarks": mda.remarks or "",
                    "authorized": mda.is_authorized,
                    "prepared_by": f"{mda.prepared_by.first_name} {mda.prepared_by.last_name} ({mda.prepared_by.role_type})" if mda.prepared_by else None,
                    "finance_approved_by": f"{mda.finance_approved_by.first_name} {mda.finance_approved_by.last_name} ({mda.finance_approved_by.role_type})" if mda.finance_approved_by else None,
                    "authorized_by": f"{mda.authorized_by.first_name} {mda.authorized_by.last_name} ({mda.authorized_by.role_type})" if mda.authorized_by else None,
                    "store_incharge": f"{mda.store_incharge.first_name} {mda.store_incharge.last_name} ({mda.store_incharge.role_type})" if mda.store_incharge else None,
                    "dispatch_status": mda.dispatch_status,
                    "created_at":mda.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "authorized_at": mda.authorized_at.strftime("%Y-%m-%d %H:%M:%S") if mda.authorized_at else None,

                })
            else:
                
                data.append({
                    "mda_id": mda.id,
                    "mda_no": mda.mda_no,
                    "date": mda.dispatch_date.strftime("%Y-%m-%d"),
                    "customer_name": None,
                    "product_name": None,
                    "quantity": None,
                    "total_value": None,
                    "payment_received": None,
                    "balance": None,
                    "remarks": mda.remarks or "",
                    "authorized": mda.is_authorized,
                    "prepared_by": f"{mda.prepared_by.first_name} {mda.prepared_by.last_name} ({mda.prepared_by.role_type})" if mda.prepared_by else None,
                    "finance_approved_by": f"{mda.finance_approved_by.first_name} {mda.finance_approved_by.last_name} ({mda.finance_approved_by.role_type})" if mda.finance_approved_by else None,
                    "authorized_by": f"{mda.authorized_by.first_name} {mda.authorized_by.last_name} ({mda.authorized_by.role_type})" if mda.authorized_by else None,
                    "store_incharge": f"{mda.store_incharge.first_name} {mda.store_incharge.last_name} ({mda.store_incharge.role_type})" if mda.store_incharge else None,
                    "dispatch_status": mda.dispatch_status,
                    "created_at":mda.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "authorized_at": mda.authorized_at.strftime("%Y-%m-%d %H:%M:%S") if mda.authorized_at else None,


                })

        return JsonResponse({"success": True, "data": data}, status=200)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def authorize_mda(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed."}, status=405)

    try:
        data = json.loads(request.body)
        mda_id = data.get("mda_id")
        role_id = data.get("role_id")

        if not all([mda_id, role_id]):
            return JsonResponse({"error": "Fields 'mda_id' and 'role_id' are required."}, status=400)

        mda = MaterialDispatchAdvice.objects.get(id=mda_id)
        po = mda.purchase_order
        role = Role.objects.get(id=role_id)

        
        if not po:
            return JsonResponse({
                "error": f"MDA {mda.mda_no} has no linked Purchase Order. Cannot authorize."
            }, status=400)

        if role.role_type.lower() not in ["finance", "management","admin"]:
            return JsonResponse({"error": "Only Finance or Management can authorize dispatch."}, status=403)

        
        if po.payment_status.lower() != "fully paid":
            return JsonResponse({
                "error": f"MDA {mda.mda_no} cannot be authorized. PO payment incomplete."
            }, status=403)

        
        mda.is_authorized = True
        mda.dispatch_status = "Ready to Dispatch"
        mda.authorized_by = role  
        mda.authorized_at = timezone.now()
        mda.save()

        po.is_authorized = True  
        po.authorized_by = role
        po.authorized_at = timezone.now()
        po.save()
        
        stock = OverallStock.objects.filter(component_name__iexact=po.product_name.strip()).first()
        if not stock:
            available_stock_items = list(OverallStock.objects.values_list("component_name", flat=True))
            return JsonResponse({
                "error": f"Product '{po.product_name}' not found in overall stock.",
                "available_stock_items": available_stock_items
            }, status=404)

        stock.total_quantity -= po.quantity  
        stock.total_value = round(Decimal(stock.total_quantity) * stock.average_price, 2)
        stock.save()

        return JsonResponse({
            "success": True,
            "message": f"MDA {mda.mda_no} authorized. Stock updated.",
            "data": {
                "mda_no": mda.mda_no,
                "product_name": po.product_name,
                "quantity": po.quantity,
                "remaining_stock": float(stock.total_quantity),
                "authorized": mda.is_authorized,
                "dispatch_status": mda.dispatch_status,
                "authorized_by": f"{role.first_name} {role.last_name} ({role.role_type})", 
                "authorized_at": mda.authorized_at.strftime("%Y-%m-%d %H:%M:%S")
            }
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def view_purchase_orders(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)
    try:
        pos = PurchaseOrder.objects.all().order_by("-created_on")
        data = []

        for po in pos:
            balance_amount = float(po.total_value - po.payment_received)
            payment_history = [
                {"amount": float(p.amount), "date": p.payment_date.strftime("%Y-%m-%d"), "remarks": p.remarks}
                for p in po.payments.all().order_by("-payment_date")
            ]
            data.append({
                "po_id": po.id,
                "po_number": po.po_number,
                "customer_name": po.customer_name,
                "customer_email": po.customer_email,
                "customer_address": po.customer_address,
                "product_name": po.product_name,
                "quantity": po.quantity,
                "total_value": float(po.total_value),
                "payment_received": float(po.payment_received),
                "balance": balance_amount,
                "payment_status": po.payment_status,
                "payments": payment_history,
                "date": po.created_on.strftime("%Y-%m-%d"),
                "is_authorized": po.is_authorized,  

            })
        return JsonResponse({"success": True, "data": data})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)



@csrf_exempt
def add_purchase_orders(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)
    try:
        data = json.loads(request.body)
        role_id = data.get("role_id")
        po_number = data.get("po_number")
        customer_name = data.get("customer_name")
        customer_email = data.get("customer_email")
        product_name = data.get("product_name")
        
        customer_address = data.get("customer_address", "")
        payment_terms = data.get("payment_terms", "")
        quantity = int(data.get("quantity"))
        total_value = Decimal(str(data.get("total_value")))
        payment_received = Decimal(str(data.get("payment_received", "0")))


        role = Role.objects.get(id=role_id)

        if role.role_type.lower() != "finance":
            return JsonResponse({"error": "Only Finance role can add PO"}, status=403)
        
        if not all([po_number, customer_name, product_name, quantity, total_value]):
            return JsonResponse({"error": "Missing required fields."}, status=400)

       
        if payment_received == 0:
            payment_status = "Pending"
        elif payment_received < total_value:
            payment_status = "Partially Paid"
        else:
            payment_status = "Fully Paid"

        po = PurchaseOrder.objects.create(
            po_number=po_number,
            customer_name=customer_name,
            customer_email=customer_email,
            product_name=product_name,
            quantity=quantity,
            total_value=total_value,
            payment_received=payment_received,
            payment_status=payment_status,
            created_on=timezone.now(),
            customer_address=customer_address,
            
        )

       
        if payment_received > 0:
            POPayment.objects.create(
                purchase_order=po,
                amount=Decimal(payment_received),
                remarks="Initial Payment"
            )

       

        return JsonResponse({
            "success": True,
            "message": "PO added successfully!",
            "data": {
                "po_id": po.id,
                "po_number": po.po_number,
                "customer_name": po.customer_name,
                "customer_email": po.customer_email,
                "customer_address": po.customer_address,
                "product_name": po.product_name,
                "quantity": po.quantity,
                "total_value": float(po.total_value),
                "payment_received": float(po.payment_received),
                "balance": float(po.total_value - po.payment_received),
                "payment_status": po.payment_status,
                "payments": [
                    {"amount": float(p.amount), "date": p.payment_date.strftime("%Y-%m-%d"), "remarks": p.remarks}
                    for p in po.payments.all()
                ],
                "date": po.created_on.strftime("%Y-%m-%d")
            }
        }, status=201)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)



@csrf_exempt
def add_po_payment(request, po_id):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)
    try:
        data = json.loads(request.body)
        payment_amount = Decimal(data.get("payment_received", 0))
        remarks = data.get("remarks", "")

        if payment_amount <= 0:
            return JsonResponse({"error": "Payment must be greater than zero."}, status=400)

        po = PurchaseOrder.objects.get(id=po_id)

       
        POPayment.objects.create(purchase_order=po, amount=payment_amount, remarks=remarks)

        
        total_paid = po.payments.aggregate(total=models.Sum("amount"))["total"] or Decimal("0.00")
        po.payment_received = total_paid

        previous_status = po.payment_status

      
        if total_paid == 0:
            po.payment_status = "Pending"
        elif total_paid < po.total_value:
            po.payment_status = "Partially Paid"
        else:
            po.payment_status = "Fully Paid"

        po.save()

        
        payment_history = [
            {"amount": float(p.amount), "date": p.payment_date.strftime("%Y-%m-%d"), "remarks": p.remarks}
            for p in po.payments.all().order_by("-payment_date")
        ]

        return JsonResponse({
            "success": True,
            "message": f"Payment of ₹{payment_amount} added successfully!",
            "data": {
                "po_id": po.id,
                "po_number": po.po_number,
                "customer_name": po.customer_name,
                "customer_email": po.customer_email,
                "customer_address": po.customer_address,
                "product_name": po.product_name,
                "quantity": po.quantity,
                "total_value": float(po.total_value),
                "payment_received": float(total_paid),
                "balance": float(po.total_value - total_paid),
                "payment_status": po.payment_status,
                "payments": payment_history,
                "date": po.created_on.strftime("%Y-%m-%d")
            }
        })

    except PurchaseOrder.DoesNotExist:
        return JsonResponse({"error": "PO not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)





def generate_invoice_pdf(po):
    total_value = Decimal(po.total_value)
    quantity = Decimal(po.quantity)
    rate_per_unit = total_value / quantity

    cgst = total_value * Decimal('0.025')
    sgst = total_value * Decimal('0.025')
    total_amount = total_value + cgst + sgst

    html_content = f"""
    <html>
    <head>
        <style>
            @page {{
                size: A4;
                margin: 25mm;
            }}
            body {{
                font-family: 'Helvetica', Arial, sans-serif;
                font-size: 12px;
                color: #333;
            }}
            .invoice-box {{
                width: 100%;
                padding: 20px;
                border: 1px solid #eee;
                box-shadow: 0 0 5px rgba(0,0,0,0.1);
            }}
            h1 {{
                text-align: center;
                font-size: 24px;
                margin-bottom: 20px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
            }}
            table, th, td {{
                border: 1px solid #aaa;
            }}
            th, td {{
                padding: 8px;
                text-align: left;
                vertical-align: top;
            }}
            th {{
                background-color: #f0f0f0;
            }}
            .right {{
                text-align: right;
            }}
            .center {{
                text-align: center;
            }}
            .no-border {{
                border: none !important;
            }}
            .small-text {{
                font-size: 10px;
                color: #555;
            }}
            .bank-table {{
                width: 60%;
                margin-top: 10px;
                border: 1px solid #aaa;
            }}
            .bank-table th, .bank-table td {{
                border: none;
                padding: 5px 8px;
            }}
            .bank-table th {{
                text-align: left;
                font-weight: bold;
            }}
        </style>
    </head>
    <body>
        <div class="invoice-box">
            <h1>Tax Invoice</h1>

            <table class="no-border">
                <tr class="no-border">
                    <td class="no-border" style="width:50%;">
                        <strong>From:</strong><br/>
                        Pavaman Aviation Pvt Ltd<br/>
                        2nd Floor, Kapil Kavuri Hub<br/>
                        Financial District, Nanakramguda<br/>
                        Hyderabad - 500032<br/>
                        GST No: xxxxxxx
                    </td>
                    <td class="no-border right" style="width:50%;">
                        <strong>Invoice No & Date:</strong><br/>
                        {po.po_number}<br/>
                        Date: {po.created_on.strftime("%d-%m-%Y")}
                    </td>
                        <td class="no-border right" style="width:50%;">
                        <strong>Way Bill no:</strong><br/>
                        
                    </td>
                </tr>
            </table>

            <p><strong>Bill To:</strong><br/>
            {po.customer_name}<br/>
            {po.customer_address}</p>

            <table>
                <thead>
                    <tr>
                        <th class="center">S. No</th>
                        <th>Description</th>
                        <th>HSN/SAC</th>
                        <th class="center">UOM</th>
                        <th class="center">Qty</th>
                        <th class="right">Rate (₹)</th>
                        <th class="right">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="center">1</td>
                        <td>{po.product_name}<br/>UIN NO: {po.po_number}</td>
                        <td>88062300</td>
                        <td class="center">NO</td>
                        <td class="center">{quantity}</td>
                        <td class="right">{rate_per_unit:,.2f}</td>
                        <td class="right">{total_value:,.2f}</td>
                    </tr>
                    <tr>
                        <td colspan="6" class="right"><strong>Subtotal</strong></td>
                        <td class="right">{total_value:,.2f}</td>
                    </tr>
                    <tr>
                        <td colspan="6" class="right"><strong>CGST (2.5%)</strong></td>
                        <td class="right">{cgst:,.2f}</td>
                    </tr>
                    <tr>
                        <td colspan="6" class="right"><strong>SGST (2.5%)</strong></td>
                        <td class="right">{sgst:,.2f}</td>
                    </tr>
                    <tr>
                        <td colspan="6" class="right"><strong>Total Invoice Amount</strong></td>
                        <td class="right"><strong>{total_amount:,.2f}</strong></td>
                    </tr>
                </tbody>
            </table>

            <h3>Bank Details</h3>
            <table class="bank-table">
                <tr>
                    <th>Bank Name:</th><td>ABC of India</td>
                    <th>A/C No:</th><td>123456</td>
                </tr>
                <tr>
                    <th>IFSC Code:</th><td>ABCD0123456</td>
                    <th>Branch:</th><td>Nanakramguda, Hyderabad</td>
                </tr>
            </table>

            <p class="small-text">It is certified that the particulars given above are true and correct.</p>
            <p>For Pavaman Aviation Pvt Ltd</p>
            <p style="margin-top:30px;">Authorized Signatory</p>
        </div>
    </body>
    </html>
    """

    pdf_file = BytesIO()
    pisa_status = pisa.CreatePDF(html_content, dest=pdf_file)
    if pisa_status.err:
        raise Exception("Failed to generate PDF")
    pdf_file.seek(0)
    return pdf_file


def send_invoice_email(po):
    try:
        pdf_file = generate_invoice_pdf(po)
        subject = f"[Pavaman] Invoice for {po.po_number}"
        body = f"Hello {po.customer_name},\n\nPlease find attached the invoice for your PO {po.po_number}.\n\nThank you."
        
        email = EmailMessage(
            subject,
            body,
            "no-reply@pavaman.com",  
            [po.customer_email],
        )
        email.attach(f"Invoice_{po.po_number}.pdf", pdf_file.read(), "application/pdf")
        email.send()
        print(f"✅ Email sent to {po.customer_email}")
    except Exception as e:
        print(f"❌ Email sending failed: {e}")


@csrf_exempt
def mark_ready_for_shipment(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        data = json.loads(request.body)
        mda_id = data.get("mda_id")
        role_id = data.get("role_id")

        role = Role.objects.get(id=role_id)
        mda = MaterialDispatchAdvice.objects.get(id=mda_id)

        
        if role.role_type.lower() != "stores incharge":
            return JsonResponse({"error": "Only Stores Incharge can perform this action."}, status=403)

        
        if not mda.is_authorized or mda.dispatch_status != "Ready to Dispatch":
            return JsonResponse({"error": "MDA must be authorized and in 'Ready to Dispatch' state."}, status=400)

        
        mda.dispatch_status = "Ready for Shipment"
        mda.store_incharge = role

       
        po = mda.purchase_order
        pdf_file = generate_invoice_pdf(po)

        
        from django.core.files.base import ContentFile
        invoice_filename = f"Invoice_{po.po_number}.pdf"
        mda.invoice_path.save(invoice_filename, ContentFile(pdf_file.read()))
        pdf_file.close()

        mda.save()

       
        send_invoice_email(po)

        return JsonResponse({
            "success": True,
            "message": f"MDA {mda.mda_no} marked as Ready for Shipment. Invoice generated.",
            "status": mda.dispatch_status,
            "invoice_path": mda.invoice_path.url  
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def upload_mda_excel(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed."}, status=405)

    try:
        role_id = request.POST.get("role_id")
        role = Role.objects.get(id=role_id)

        if role.role_type.lower() not in ["finance", "admin"]:
            return JsonResponse({"error": "Only Finance or Admin role can add MDA"}, status=403)

        if "excel_file" not in request.FILES:
            return JsonResponse({"error": "No file uploaded"}, status=400)

        excel_file = request.FILES["excel_file"]
        wb = load_workbook(excel_file)
        ws = wb.active

        created_mdas = []

        for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            po_number = str(row[0]).strip() if row[0] else None
            remarks = str(row[1]).strip() if len(row) > 1 and row[1] else ""

            if not po_number:
                continue

            try:
                po = PurchaseOrder.objects.get(po_number=po_number)
            except PurchaseOrder.DoesNotExist:
                continue  

            
            if po.payment_status.lower() != "fully paid":
                continue

            
            if MaterialDispatchAdvice.objects.filter(purchase_order=po).exists():
                continue

            
            mda_no = f"MDA-{timezone.now().strftime('%Y%m%d')}-{MaterialDispatchAdvice.objects.count()+1:03d}"

            mda = MaterialDispatchAdvice.objects.create(
                mda_no=mda_no,
                purchase_order=po,
                remarks=remarks,
                prepared_by=role,
                dispatch_status="Pending",
                is_authorized=False
            )

            
            created_mdas.append({
                "mda_no": mda.mda_no,
                "po_number": po.po_number,
                "customer_name": po.customer_name,
                "product_name": po.product_name,
                "quantity": po.quantity,
                "total_order_value": float(po.total_value),
                "payment_received": float(po.payment_received),
                "payment_status": po.payment_status,
                "dispatch_status": mda.dispatch_status,
                "created_at": mda.created_at.strftime("%Y-%m-%d %H:%M:%S") if hasattr(mda, "created_at") else "",
                "prepared_by": role.first_name,
                "prepared_by_id": role.id,
                "remarks": remarks
            })

        return JsonResponse({
            "success": True,
            "message": f"{len(created_mdas)} MDA(s) created successfully.",
            "data": created_mdas
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)






@csrf_exempt
def upload_material_receipt_excel(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Only POST method allowed."}, status=405)

    try:
        added_receipts = []
        errors = []

        
        excel_file = request.FILES.get("excel_file")
        if not excel_file:
            return JsonResponse({"success": False, "message": "Excel file is required"}, status=400)

        
        wb = load_workbook(filename=BytesIO(excel_file.read()))
        sheet = wb.active

        
        header_mapping = {
            "part_number": ["part #", "part number", "part_no"],
            "hsn_code": ["hsn code", "hsn"],
            "component_name": ["component name", "component", "comp name"],
            "supplier": ["supplier", "vendor"],
            "invoice_no": ["number", "invoice number", "inv no"],
            "invoice_date": ["date", "invoice date", "inv date"],
            "po_no": ["number", "po number", "po no"],
            "po_date": ["date", "po date", "po_date"],
            "uom": ["uom", "unit of measure"],
            "quantity": ["qty", "quantity"],
            "unit_price": ["unit price", "price per unit"],
            "total_price": ["total price", "total_amount", "total amount"],
            "taxes": ["taxes", "tax"],
        }

        
        header_row_index = None
        column_index_map = {}
        for i, row in enumerate(sheet.iter_rows(values_only=True), start=1):
            for j, cell in enumerate(row):
                if not cell:
                    continue
                cell_norm = str(cell).strip().lower()
                if cell_norm in header_mapping:
                    column_index_map[cell_norm] = j
                else:
                    for field, variants in header_mapping.items():
                        if field not in column_index_map and cell_norm in variants:
                            column_index_map[field] = j
            if len(column_index_map) >= 10:
                header_row_index = i
                break

        if not header_row_index:
            return JsonResponse({
                "success": False,
                "message": f"No valid header row found. Columns detected: {list(column_index_map.keys())}"
            }, status=400)

        
        user_role = Role.objects.filter(role_type__in=["Admin", "stores incharge"]).first()
        if not user_role:
            return JsonResponse({
                "success": False,
                "message": "Only Admin or Stores Incharge can use this API"
            }, status=403)

        
        for idx, row in enumerate(sheet.iter_rows(min_row=header_row_index + 1, values_only=True), start=header_row_index + 1):
            if all(cell in [None, ""] for cell in row):
                continue

            
            row_data = {}
            for field, col_idx in column_index_map.items():
                value = row[col_idx] if col_idx < len(row) else None
                row_data[field] = value

            print(f"Row {idx} mapped data: {row_data}")

            try:
                role = user_role

                if role.role_type.lower() in ["admin", "stores incharge"]:
                    try:
                        quantity = int(float(row_data.get("quantity") or 0))
                        unit_price = float(row_data.get("unit_price") or 0)
                        total_price = float(row_data.get("total_price") or 0)
                        taxes = float(row_data.get("taxes") or 0)
                    except:
                        errors.append(f"Row {idx} error: Invalid numeric values.")
                        continue

                    part_number = str(row_data.get("part_number") or "").strip()
                    invoice_no = str(row_data.get("invoice_no") or "").strip()
                    supplier = str(row_data.get("supplier") or "").strip()

                   
                    duplicate_exists = MaterialReceipt.objects.filter(
                        part_number__iexact=part_number,
                        invoice_no__iexact=invoice_no,
                        supplier__iexact=supplier
                    ).exists()

                    if duplicate_exists:
                        errors.append(f"Row {idx} skipped: Duplicate record found for part_number '{part_number}' and invoice_no '{invoice_no}'.")
                        continue

                    receipt = MaterialReceipt.objects.create(
                        role=role,
                        part_number=part_number,
                        hsn_code=row_data.get("hsn_code"),
                        component_name=row_data.get("component_name"),
                        supplier=supplier,
                        invoice_no=invoice_no,
                        invoice_date=row_data.get("invoice_date"),
                        po_no=row_data.get("po_no"),
                        po_date=row_data.get("po_date"),
                        uom=row_data.get("uom"),
                        quantity=quantity,
                        unit_price=unit_price,
                        total_price=total_price,
                        taxes=taxes
                    )

                    added_receipts.append({
                        "id": receipt.id,
                        "part_number": receipt.part_number,
                        "component_name": receipt.component_name,
                        "supplier": receipt.supplier,
                        "role_type": role.role_type,
                        "quantity": quantity,
                        "action": "Created new receipt",
                    })
                else:
                    errors.append(f"Row {idx} skipped: Unauthorized role {role.role_type}")

            except Exception as e:
                errors.append(f"Row {idx} error: {str(e)}")

        return JsonResponse({
            "success": True,
            "added_receipts_count": len(added_receipts),
            "added_receipts": added_receipts,
            "errors": errors
        }, status=200)

    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)



@csrf_exempt
def inspect_material_excel(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        role_id = request.POST.get("role_id")
        if not role_id:
            return JsonResponse({"error": "Field 'role_id' is required."}, status=400)

        role = Role.objects.filter(id=role_id).only("id", "role_type").first()
        if not role:
            return JsonResponse({"error": "Role not found"}, status=404)

        # ✅ Correct role check
        if role.role_type.lower() not in ["quality incharge", "admin"]:
            return JsonResponse({"error": "Only Quality Incharge or Admin can perform inspection."}, status=403)

        user = getattr(role, "user", None)  
        quality_incharge_name = getattr(user, "name", None) if user else None

        excel_file = request.FILES.get("excel_file")
        if not excel_file:
            return JsonResponse({"error": "Excel File is required."}, status=400)

        wb = openpyxl.load_workbook(excel_file)
        ws = wb.active

        header = [str(cell.value).strip().lower() for cell in next(ws.iter_rows(min_row=1, max_row=1, values_only=False))]
        required_columns = ["part_number", "invoice_no", "accepted_qty", "rejected_qty"]
        missing_cols = [col for col in required_columns if col not in header]
        if missing_cols:
            return JsonResponse({
                "success": False,
                "message": f"Missing columns in Excel: {', '.join(missing_cols)}. Detected: {header}"
            }, status=400)

        col_index = {col: header.index(col) for col in required_columns}
        updated_records = []
        stock_data = {}

        with transaction.atomic():
            part_invoice_pairs = []
            for row in ws.iter_rows(min_row=2, values_only=True):
                part_number = str(row[col_index["part_number"]]).strip() if row[col_index["part_number"]] else None
                invoice_no = str(row[col_index["invoice_no"]]).strip() if row[col_index["invoice_no"]] else None
                if part_number and invoice_no:
                    part_invoice_pairs.append((part_number, invoice_no))

            from django.db.models import Q
            query = Q()
            for part_number, invoice_no in part_invoice_pairs:
                query |= Q(part_number=part_number, invoice_no=invoice_no)

            receipts = list(MaterialReceipt.objects.select_for_update().filter(query))
            receipt_map = {(r.part_number, r.invoice_no): r for r in receipts}

            for idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                part_number = str(row[col_index["part_number"]]).strip() if row[col_index["part_number"]] else None
                invoice_no = str(row[col_index["invoice_no"]]).strip() if row[col_index["invoice_no"]] else None
                accepted_qty = int(row[col_index["accepted_qty"]] or 0)
                rejected_qty = int(row[col_index["rejected_qty"]] or 0)

                if not part_number or not invoice_no:
                    continue

                receipt = receipt_map.get((part_number, invoice_no))
                if not receipt:
                    continue

                if accepted_qty + rejected_qty != receipt.quantity:
                    return JsonResponse({
                        "error": f"Row {idx}: Accepted + Rejected must equal total quantity "
                                 f"for part {part_number}, invoice {invoice_no}."
                    }, status=400)

                receipt.accepted_quantity = accepted_qty
                receipt.rejected_quantity = rejected_qty
                receipt.inspection_status = "completed"
                receipt.updated_at = timezone.now()
                receipt.role_id = role_id
                receipt.quality_incharge = role_id  
                key = (receipt.component_name, receipt.uom)
                if key not in stock_data:
                    stock_data[key] = {"accepted_qty": 0, "unit_price": float(receipt.unit_price)}
                stock_data[key]["accepted_qty"] += accepted_qty

                updated_records.append({
                    "part_number": part_number,
                    "invoice_no": invoice_no,
                    "component_name": receipt.component_name,
                    "quantity": receipt.quantity,
                    "accepted_quantity": accepted_qty,
                    "rejected_quantity": rejected_qty,
                    "unit_price": float(receipt.unit_price),
                    "inspection_status": "completed",
                    "role_id": role_id,
                    "quality_incharge": role_id,
                    "quality_incharge_name": quality_incharge_name,
                    "updated_at": receipt.updated_at.strftime("%Y-%m-%d %H:%M:%S")
                })

            if receipts:
                MaterialReceipt.objects.bulk_update(
                    receipts,
                    ["accepted_quantity", "rejected_quantity", "inspection_status", "updated_at", "role_id", "quality_incharge"]
                )

            existing_stocks = {
                (s.component_name, s.uom): s
                for s in OverallStock.objects.filter(
                    component_name__in=[k[0] for k in stock_data.keys()],
                    uom__in=[k[1] for k in stock_data.keys()]
                )
            }

            new_stocks, updated_stocks = [], []
            for (component_name, uom), info in stock_data.items():
                stock = existing_stocks.get((component_name, uom))
                if stock:
                    stock.total_quantity += info["accepted_qty"]
                    stock.average_price = info["unit_price"]
                    stock.total_value = stock.total_quantity * info["unit_price"]
                    updated_stocks.append(stock)
                else:
                    new_stocks.append(
                        OverallStock(
                            component_name=component_name,
                            uom=uom,
                            total_quantity=info["accepted_qty"],
                            average_price=info["unit_price"],
                            total_value=info["accepted_qty"] * info["unit_price"],
                        )
                    )

            if new_stocks:
                OverallStock.objects.bulk_create(new_stocks, ignore_conflicts=True)
            if updated_stocks:
                OverallStock.objects.bulk_update(updated_stocks, ["total_quantity", "average_price", "total_value"])

        return JsonResponse({
            "success": True,
            "message": f"{len(updated_records)} materials inspected successfully and overall stock updated.",
            "data": updated_records,
        })

    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)




@csrf_exempt
def upload_sin_excel(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid method"}, status=405)

    excel_file = request.FILES.get("excel_file")
    if not excel_file:
        return JsonResponse({"success": False, "message": "Excel file is required"}, status=400)

    try:
        data = request.POST  # If you are sending issued_by_id, received_by_id in form-data
        wb = load_workbook(filename=BytesIO(excel_file.read()))
        sheet = wb.active

        created_sins = []
        skipped_rows = []
        errors = []

        # Helper to format role info
        def get_role_details(role_obj):
            full_name = f"{role_obj.first_name} {role_obj.last_name}".strip() or (role_obj.email or role_obj.mobile_no)
            return {
                "id": role_obj.id,
                "name": full_name,
                "role_type": role_obj.role_type,
                "display": f"{full_name} ({role_obj.role_type})"
            }

        # Get active roles
        roles = {r.id: r for r in Role.objects.filter(status=1)}

        # Issued by
        issued_role = roles.get(int(data.get("issued_by_id"))) if data.get("issued_by_id") else None
        if not issued_role:
            issued_role = Role.objects.filter(role_type__iexact="stores incharge", status=1).first()
        if not issued_role:
            return JsonResponse({"error": "No active Stores Incharge found."}, status=404)
        issued_details = get_role_details(issued_role)

        # Authorized by
        role = roles.get(int(data.get("role_id"))) if data.get("role_id") else issued_role
        if role.role_type.lower() == "admin":
            authorized_role = role
        else:
            authorized_role = Role.objects.filter(role_type__iexact="admin", status=1).first() or role
        authorized_details = get_role_details(authorized_role)

        # Received by
        received_role = roles.get(int(data.get("received_by_id"))) if data.get("received_by_id") else None
        if not received_role:
            received_role = Role.objects.filter(role_type__iexact="production incharge", status=1).first()
        if not received_role:
            return JsonResponse({"error": "No active Production Incharge found."}, status=404)
        received_details = get_role_details(received_role)

        # Default role for response
        response_role = role.role_type

        for idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            try:
                row = list(row)
                sno = row[0] if len(row) > 0 else None
                component_name = row[1] if len(row) > 1 else None
                uom = row[2] if len(row) > 2 else None
                qty_requested = row[3] if len(row) > 3 else None
                qty_issued = row[4] if len(row) > 4 else 0
                balance = row[5] if len(row) > 5 else (qty_requested - qty_issued if qty_requested and qty_issued else qty_requested)
                remarks = row[6] if len(row) > 6 else ""

                if not component_name or not uom or not qty_requested:
                    skipped_rows.append(idx)
                    continue

                sin_no = f"SIN-{StoresIssueNote.objects.count() + 1}"

                sin = StoresIssueNote.objects.create(
                    component_name=component_name,
                    uom=uom,
                    qty_requested=int(qty_requested),
                    qty_issued=int(qty_issued) if qty_issued else 0,
                    balance=int(balance) if balance else int(qty_requested),
                    remarks=remarks or "",
                    sin_no=sin_no,
                    date=timezone.now().date(),
                    issued_by=issued_details["display"],
                    authorized_by=authorized_details["display"],
                    stores_ic=issued_details["display"],
                    received_by=received_details["display"]
                )

                created_sins.append({
                    "role": response_role,
                    "component_name": component_name,
                    "uom": uom,
                    "qty_requested": int(qty_requested),
                    "qty_issued": int(qty_issued) if qty_issued else 0,
                    "balance": int(balance) if balance else int(qty_requested),
                    "remarks": remarks or "",
                    "sin_no": sin_no,
                    "date": timezone.now().date(),
                    "issued_by": issued_details["display"],
                    "authorized_by": authorized_details["display"],
                    "received_by": received_details["display"],
                    "stores_ic": issued_details["display"],
                    "unit_price_at_issue": 0,
                    "issued_date": timezone.now().date()
                })

            except Exception as e:
                errors.append(f"Row {idx}: {str(e)}")

        return JsonResponse({
            "success": True,
            "created_sins": created_sins,
            "skipped_rows": skipped_rows,
            "errors": errors
        }, status=200)

    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)




@csrf_exempt
def upload_mtn_excel(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Only POST method allowed."}, status=405)

    if not request.FILES:
        return JsonResponse({"success": False, "message": "Excel file is required."}, status=400)

    excel_file = next(iter(request.FILES.values()))

    try:
        wb = load_workbook(filename=BytesIO(excel_file.read()))
        sheet = wb.active

        def normalize_header(h):
            if not h:
                return ""
            return "".join(str(h).strip().replace("\xa0", "").lower().split())

        def get_role_details(role_obj):
            full_name = f"{role_obj.first_name} {role_obj.last_name}".strip() or (role_obj.email or role_obj.mobile_no)
            return {
                "id": role_obj.id,
                "name": full_name,
                "role_type": role_obj.role_type,
                "display": f"{full_name} ({role_obj.role_type})"
            }

        data = request.POST
        roles = {}

        issued_role = roles.get(data.get("issued_by_id")) or Role.objects.filter(role_type__iexact="stores incharge", status=1).first()
        received_role = roles.get(data.get("received_by_id")) or Role.objects.filter(role_type__iexact="production incharge", status=1).first()
        admin_role = Role.objects.filter(role_type__iexact="admin", status=1).first()

        if not issued_role or not received_role or not admin_role:
            return JsonResponse({"success": False, "message": "Required roles not found."}, status=404)

        issued_details = get_role_details(issued_role)
        authorized_details = get_role_details(admin_role)
        received_details = get_role_details(received_role)

        last_mtn = MaterialTransferNote.objects.order_by('-id').first()
        if last_mtn and last_mtn.mtn_no.startswith("MTN"):
            try:
                last_no = int(last_mtn.mtn_no.replace("MTN", "")) + 1
                mtn_no = f"MTN{last_no}"
            except:
                mtn_no = "MTN1001"
        else:
            mtn_no = "MTN1001"

        created_items = []
        errors = []

        headers = {}
        required_normalized = ["item", "uom", "qtytransferred", "remarks"]
        for r in range(1, 11):
            row = sheet[r]
            for idx, cell in enumerate(row):
                if cell.value:
                    h = normalize_header(cell.value)
                    if h in required_normalized:
                        headers[h] = idx
            if len(headers) == len(required_normalized):
                break

        missing = [h for h in required_normalized if h not in headers]
        if missing:
            return JsonResponse({"success": False, "message": f"Missing required header(s): {', '.join(missing)}"}, status=400)

        with transaction.atomic():
            mtn = MaterialTransferNote.objects.create(
                mtn_no=mtn_no,
                issued_by=issued_details["display"],
                authorized_by=authorized_details["display"],
                received_by=received_details["display"],
            )

            start_row = r + 1
            for idx, row in enumerate(sheet.iter_rows(min_row=start_row, values_only=True), start=start_row):
                try:
                    item_name = str(row[headers["item"]]).strip() if row[headers["item"]] is not None else ""
                    uom = str(row[headers["uom"]]).strip() if row[headers["uom"]] is not None else ""
                    qty_transferred_raw = row[headers["qtytransferred"]] if row[headers["qtytransferred"]] is not None else 0
                    remarks = str(row[headers["remarks"]]).strip() if row[headers["remarks"]] is not None else ""

                    if not any([item_name, uom, qty_transferred_raw, remarks]):
                        continue

                    try:
                        qty_transferred = Decimal(qty_transferred_raw)
                        if qty_transferred < 0:
                            qty_transferred = Decimal("0")
                    except (TypeError, ValueError, InvalidOperation):
                        qty_transferred = Decimal("0")

                    def generate_unique_sin():
                        last_id = MaterialItem.objects.aggregate(max_id=Max('id'))['max_id'] or 0
                        return f"SIN{last_id + 1:03d}"

                    material_item = MaterialItem.objects.create(
                        mtn=mtn,
                        item_name=item_name,
                        uom=uom,
                        qty_transferred=qty_transferred,
                        remarks=remarks
                    )

                    created_items.append({
                        "id": material_item.id,
                        "item_name": material_item.item_name,
                        "uom": material_item.uom,
                        "qty_transferred": str(int(material_item.qty_transferred)) if material_item.qty_transferred == material_item.qty_transferred.to_integral() else str(material_item.qty_transferred),

                        "remarks": material_item.remarks
                    })

                except Exception as e:
                    errors.append(f"Row {idx}: {str(e)}")

        response_data = {
            "success": True,
            "data": {
                "id": mtn.id,
                "mtn_no": mtn.mtn_no,
                "issued_by": mtn.issued_by,
                "authorized_by": mtn.authorized_by,
                "received_by": mtn.received_by,
                "created_at": mtn.created_at.strftime("%Y-%m-%d %H:%M:%S") if hasattr(mtn, "created_at") else "",
                "role_id": issued_details["id"],
                "items": created_items
            },
            "errors": errors
        }

        return JsonResponse(response_data, status=201)

    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)




@csrf_exempt
def upload_mrn_excel(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        import math

        file = request.FILES.get("file") or request.FILES.get("excel_file")
        if not file:
            return JsonResponse({"error": "Excel file is required with key 'file' or 'excel_file'."}, status=400)
        if not file.name.endswith(('.xlsx', '.xls')):
            return JsonResponse({"error": "Invalid file type. Only .xlsx or .xls files are allowed."}, status=400)

        df_raw = pd.read_excel(file, header=None, sheet_name=0)

        # Detect header row
        header_row_index = None
        for i in range(min(20, len(df_raw))):
            row_values = [str(x).strip().lower().replace("\n", " ").replace("\xa0", " ") for x in df_raw.iloc[i].fillna("")]
            if "component name" in row_values and "uom" in row_values:
                header_row_index = i
                break

        if header_row_index is None:
            preview_data = df_raw.fillna("").head(10).to_dict(orient="records")
            return JsonResponse({
                "error": "Could not detect header row containing 'component name' and 'uom'. Please check Excel.",
                "preview_data": preview_data
            }, status=400)

        df = pd.read_excel(file, header=header_row_index, sheet_name=0)
        df.columns = [str(c).strip().lower().replace("\n", " ").replace("\xa0", " ").replace(".", "") for c in df.columns]

        column_mapping = {
            "component name": "component_name",
            "product name": "product_name",
            "uom": "uom",
            "qty rejected": "qty_rejected",
            "qty": "qty_rejected",
            "quantity": "quantity",
            "reason": "reason",
            "rejected": "qty_rejected"
        }
        df = df.rename(columns={col: column_mapping[col] for col in df.columns if col in column_mapping})
        df = df.dropna(how="all")
        if df.empty:
            return JsonResponse({"error": "No valid data found in Excel after processing."}, status=400)

        # ✅ Role logic integration
        def get_role_details(role_obj):
            full_name = f"{role_obj.first_name} {role_obj.last_name}".strip() or (role_obj.email or role_obj.mobile_no)
            return {
                "id": role_obj.id,
                "name": full_name,
                "role_type": role_obj.role_type,
                "display": f"{full_name} ({role_obj.role_type})"
            }

        roles = {r.id: r for r in Role.objects.filter(status=1)}

        role_id = request.POST.get("role_id")
        if not role_id:
            default_role = Role.objects.first()
            role_id = default_role.id if default_role else None

        role = roles.get(int(role_id)) if role_id else None

        # Get issued, received, and authorized roles
        data = request.POST

        issued_role = roles.get(data.get("issued_by_id")) or Role.objects.filter(role_type__iexact="stores incharge", status=1).first()
        if not issued_role:
            return JsonResponse({"error": "No active Production Incharge found."}, status=404)
        issued_details = get_role_details(issued_role)

        received_role = roles.get(data.get("received_by_id")) or Role.objects.filter(role_type__iexact="production incharge", status=1).first()
        if not received_role:
            return JsonResponse({"error": "No active Stores Incharge found."}, status=404)
        received_details = get_role_details(received_role)

        if role and role.role_type.lower() == "admin":
            authorized_role = role
        else:
            authorized_role = Role.objects.filter(role_type__iexact="admin", status=1).first() or role
        authorized_details = get_role_details(authorized_role)

        # Determine MRN number
        first_product_name_series = df["product_name"].loc[df["product_name"].notna() & (df["product_name"] != "")]
        product_name_mrn = first_product_name_series.iloc[0] if not first_product_name_series.empty else "Unknown Product"
        mrn_no = f"MRN{MaterialRejectionNote.objects.count() + 1}"

        # Create MRN record
        mrn = MaterialRejectionNote.objects.create(
            role_id=role_id,
            mrn_no=mrn_no,
            issued_by=issued_details["display"],
            received_by=received_details["display"],
            product_name=product_name_mrn,
            quantity=0,
            created_at=timezone.now()
        )

        items_list = []
        for index, row in df.iterrows():
            component_name_item = str(row.get("component_name", "")).strip()
            product_name_item = str(row.get("product_name", "")).strip()
            uom_item = str(row.get("uom", "")).strip()
            reason_item = str(row.get("reason", "")).strip()

            missing_fields = []
            if not component_name_item:
                missing_fields.append("component_name")
            if not product_name_item:
                missing_fields.append("product_name")
            if not uom_item:
                missing_fields.append("uom")
            if not reason_item:
                missing_fields.append("reason")

            try:
                qty_rejected = float(row.get("qty_rejected"))
                if math.isnan(qty_rejected):
                    raise ValueError()
            except:
                missing_fields.append("qty_rejected")

            try:
                quantity = float(row.get("quantity"))
                if math.isnan(quantity):
                    raise ValueError()
            except:
                missing_fields.append("quantity")

            if missing_fields:
                return JsonResponse({
                    "error": f"Row {index+1} is missing or has invalid fields: {', '.join(missing_fields)}"
                }, status=400)

            item = RejectedItem.objects.create(
                mrn=mrn,
                component_name=component_name_item,
                product_name=product_name_item,
                uom=uom_item,
                qty_rejected=qty_rejected,
                quantity=quantity,
                reason=reason_item
            )

            stock_obj, created = RejectedMaterialStock.objects.get_or_create(
                component_name=item.component_name,
                defaults={
                    "uom": item.uom,
                    "qty_in_stock": qty_rejected,
                    "value": 0,
                    "role_id": mrn.role_id
                }
            )
            if not created:
                stock_obj.qty_in_stock += qty_rejected
                stock_obj.save()

            items_list.append({
                "id": item.id,
                "component_name": item.component_name,
                "product_name": item.product_name,
                "uom": item.uom,
                "qty_rejected": item.qty_rejected,
                "quantity": item.quantity,
                "reason": item.reason
            })

        mrn.quantity = sum(item['quantity'] for item in items_list)
        mrn.save()

        response_data = {
            "id": mrn.id,
            "mrn_no": mrn.mrn_no,
            "issued_by": issued_details,
            "received_by": received_details,
            "authorized_by": authorized_details,
            "created_at": mrn.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "role_id": mrn.role_id,
            "items": items_list
        }

        return JsonResponse({
            "success": True,
            "message": "Material Rejection Note created successfully.",
            "data": response_data
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def view_daily_consolidated_report(request):
    """
    Returns consolidated inventory report for a date range.
    Supports 'day' or 'month' aggregation via 'report_type'.
    Shows ALL dates from first record to today, including zero-value dates.
    """
    try:
        if request.method != "POST":
            return JsonResponse({"success": False, "message": "Invalid method"}, status=405)

        data = json.loads(request.body)
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        report_type = data.get("report_type", "day")

        today = timezone.now().date()

       
        if not start_date:
            
            receipt_min = MaterialReceipt.objects.aggregate(min_date=Min('created_at__date'))['min_date']
            issue_min = StoresIssueNote.objects.aggregate(min_date=Min('issued_date'))['min_date']
            sales_min = PurchaseOrder.objects.aggregate(min_date=Min('created_on__date'))['min_date']
            
            
            all_min_dates = [d for d in [receipt_min, issue_min, sales_min] if d is not None]
            start_date = min(all_min_dates) if all_min_dates else (today - timedelta(days=30))
        
        if not end_date:
            end_date = today

        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        if isinstance(end_date, str):
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date()

       
        if start_date > today:
            return JsonResponse({
                "success": False,
                "message": "Start date cannot be in the future."
            }, status=400)

        if end_date > today:
            end_date = today

        
        if start_date > end_date:
            return JsonResponse({
                "success": False, 
                "message": "Start date cannot be after end date."
            }, status=400)

        print(f"📅 Processing ALL dates from {start_date} to {end_date}")

       
        dates_with_transactions = set()
        
        
        receipt_dates = MaterialReceipt.objects.filter(
            created_at__date__range=[start_date, end_date]
        ).values_list('created_at__date', flat=True).distinct()
        dates_with_transactions.update(receipt_dates)
        
        
        issue_dates = StoresIssueNote.objects.filter(
            issued_date__range=[start_date, end_date],
            qty_issued__gt=0
        ).values_list('issued_date', flat=True).distinct()
        dates_with_transactions.update(issue_dates)
        
      
        sales_dates = PurchaseOrder.objects.filter(
            created_on__date__range=[start_date, end_date]
        ).values_list('created_on__date', flat=True).distinct()
        dates_with_transactions.update(sales_dates)

        
        transaction_dates = [date for date in dates_with_transactions if start_date <= date <= end_date]
        print(f"📊 Found {len(transaction_dates)} dates with transactions")

        for date in transaction_dates:
            update_or_create_daily_report(date)

        report_list = []

        if report_type == "day":
            
            current_date = start_date
            s_no = 1
            
            while current_date <= end_date:
               
                daily_report = DailyInventoryReport.objects.filter(report_date=current_date).first()
                
                if daily_report:
                    report_list.append({
                        "s_no": s_no,
                        "date_or_month": current_date.strftime("%Y-%m-%d"),
                        "total_stock_received_qty": daily_report.total_stock_received_qty,
                        "total_stock_received_value": float(daily_report.total_stock_received_value),
                        "total_stock_issued_qty": daily_report.total_stock_issued_qty,
                        "total_sales_value": float(daily_report.total_sales_value),
                        "total_cost": float(daily_report.total_cost),
                        "profit_or_loss": float(daily_report.profit_or_loss),
                    })
                else:
                    
                    
                    report_list.append({
                        "s_no": s_no,
                        "date_or_month": current_date.strftime("%Y-%m-%d"),
                        "total_stock_received_qty": 0,
                        "total_stock_received_value": 0,
                        "total_stock_issued_qty": 0,
                        "total_sales_value": 0,
                        "total_cost": 0,
                        "profit_or_loss": 0,
                    })
                
                s_no += 1
                current_date += timedelta(days=1)

        elif report_type == "month":
            
        
            for date in transaction_dates:
                update_or_create_daily_report(date)
            
            
            queryset = DailyInventoryReport.objects.filter(
                report_date__range=[start_date, end_date]
            )
            
            
            if not queryset.exists():
                
                key_dates = [start_date, end_date]
                for date in key_dates:
                    DailyInventoryReport.objects.update_or_create(
                        report_date=date,
                        defaults={
                            "total_stock_received_qty": 0,
                            "total_stock_received_value": 0,
                            "total_stock_issued_qty": 0,
                            "total_sales_value": 0,
                            "total_cost": 0,
                            "profit_or_loss": 0,
                        }
                    )
                queryset = DailyInventoryReport.objects.filter(report_date__range=[start_date, end_date])

            reports = queryset.annotate(month=TruncMonth('report_date')).values('month').annotate(
                total_stock_received_qty=Sum('total_stock_received_qty'),
                total_stock_received_value=Sum('total_stock_received_value'),
                total_stock_issued_qty=Sum('total_stock_issued_qty'),
                total_sales_value=Sum('total_sales_value'),
                total_cost=Sum('total_cost'),
                profit_or_loss=Sum('profit_or_loss')
            ).order_by('month')

            for idx, report in enumerate(reports, start=1):
                report_list.append({
                    "s_no": idx,
                    "date_or_month": report['month'].strftime("%B %Y"),
                    "total_stock_received_qty": report['total_stock_received_qty'] or 0,
                    "total_stock_received_value": float(report['total_stock_received_value'] or 0),
                    "total_stock_issued_qty": report['total_stock_issued_qty'] or 0,
                    "total_sales_value": float(report['total_sales_value'] or 0),
                    "total_cost": float(report['total_cost'] or 0),
                    "profit_or_loss": float(report['profit_or_loss'] or 0),
                })
        else:
            return JsonResponse({"success": False, "message": "Invalid report_type"}, status=400)

        return JsonResponse({"success": True, "data": report_list}, status=200)

    except Exception as e:
        import traceback
        return JsonResponse({"success": False, "message": f"Error: {str(e)}\nTraceback: {traceback.format_exc()}"}, status=500)


def generate_daily_reports(start_date, end_date):
    """
    Optimized version - only generates reports for dates with transactions
    """
   
    dates_with_transactions = set()
    
    receipt_dates = MaterialReceipt.objects.filter(
        created_at__date__range=[start_date, end_date]
    ).values_list('created_at__date', flat=True).distinct()
    dates_with_transactions.update(receipt_dates)
    
    issue_dates = StoresIssueNote.objects.filter(
        issued_date__range=[start_date, end_date],
        qty_issued__gt=0
    ).values_list('issued_date', flat=True).distinct()
    dates_with_transactions.update(issue_dates)
    
    sales_dates = PurchaseOrder.objects.filter(
        created_on__date__range=[start_date, end_date]
    ).values_list('created_on__date', flat=True).distinct()
    dates_with_transactions.update(sales_dates)

    
    for date in dates_with_transactions:
        if start_date <= date <= end_date:
            update_or_create_daily_report(date)


def update_or_create_daily_report(report_date):
    """
    Optimized version with better queries - FIXED select_related issue
    """
   
    received_data = MaterialReceipt.objects.filter(created_at__date=report_date).aggregate(
        total_qty=Sum("accepted_quantity"),
        total_value=Sum(F("accepted_quantity") * F("unit_price"))
    )
    total_received_qty = received_data["total_qty"] or 0
    total_received_value = received_data["total_value"] or Decimal(0)

    
    issued_items = StoresIssueNote.objects.filter(issued_date=report_date, qty_issued__gt=0)
    total_issued_qty = issued_items.aggregate(total_qty=Sum("qty_issued"))["total_qty"] or 0

   
    total_cost = Decimal(0)
    
    
    issued_items_list = list(issued_items)
    
    if issued_items_list:
        
        component_names = list(set([item.component_name for item in issued_items_list]))
        uoms = list(set([item.uom for item in issued_items_list]))
        
      
        stock_prices = OverallStock.objects.filter(
            component_name__in=component_names,
            uom__in=uoms
        ).values('component_name', 'uom', 'average_price')
        
        
        price_lookup = {(stock['component_name'], stock['uom']): stock['average_price'] 
                       for stock in stock_prices if stock['average_price']}
        
       
        for item in issued_items_list:
            avg_price = price_lookup.get((item.component_name, item.uom))
            if avg_price and avg_price > 0:
                item_cost = Decimal(item.qty_issued) * Decimal(avg_price)
                total_cost += item_cost

    
    total_sales_value = PurchaseOrder.objects.filter(created_on__date=report_date).aggregate(
        total_value=Sum("total_value")
    )["total_value"] or Decimal(0)

   
    profit_or_loss = total_sales_value - total_cost

    
    report, created = DailyInventoryReport.objects.update_or_create(
        report_date=report_date,
        defaults={
            "total_stock_received_qty": total_received_qty,
            "total_stock_received_value": total_received_value,
            "total_stock_issued_qty": total_issued_qty,
            "total_sales_value": total_sales_value,
            "total_cost": total_cost,
            "profit_or_loss": profit_or_loss,
        },
    )

    return report

@csrf_exempt
def view_consolidated_report_details(request):
    """
    Returns per-component inventory details for a specific day or month.
    """
    try:
        if request.method != "POST":
            return JsonResponse({"success": False, "message": "Invalid method"}, status=405)

        data = json.loads(request.body)
        report_type = data.get("report_type", "day")
        date_str = data.get("date")
        month_str = data.get("month")

        if report_type == "day":
            if not date_str:
                return JsonResponse({"success": False, "message": "Missing 'date' parameter"}, status=400)
            report_date = datetime.strptime(date_str, "%Y-%m-%d").date()

            receipts = MaterialReceipt.objects.filter(created_at__date=report_date)
            
            issues = StoresIssueNote.objects.filter(
                issued_date=report_date,
                qty_issued__gt=0
            ).distinct()
            
            dispatches = MaterialDispatchAdvice.objects.filter(
                created_at__date=report_date,
                dispatch_status__in=["Dispatched", "Ready to Dispatch"]
            )

        elif report_type == "month":
            if not month_str:
                return JsonResponse({"success": False, "message": "Missing 'month' parameter"}, status=400)
            year, month = map(int, month_str.split("-"))

            receipts = MaterialReceipt.objects.filter(created_at__year=year, created_at__month=month)
            
            issues = StoresIssueNote.objects.filter(
                issued_date__year=year, 
                issued_date__month=month,
                qty_issued__gt=0
            ).distinct()
            
            dispatches = MaterialDispatchAdvice.objects.filter(
                created_at__year=year, created_at__month=month,
                dispatch_status__in=["Dispatched", "Ready to Dispatch"]
            )

        else:
            return JsonResponse({"success": False, "message": "Invalid report_type"}, status=400)

        receipt_components = receipts.values_list('component_name', flat=True).distinct()
        issue_components = issues.values_list('component_name', flat=True).distinct()
        all_components = set(list(receipt_components) + list(issue_components))
        
        detail_list = []

        total_sales_value = sum(
            dispatch.purchase_order.total_value 
            for dispatch in dispatches 
            if dispatch.purchase_order
        )

        for comp in all_components:
            comp_receipts = receipts.filter(component_name=comp)
            received = comp_receipts.aggregate(
                total_qty=Sum("accepted_quantity"),
                avg_price=Avg("unit_price"),
                total_value=Sum(F("accepted_quantity") * F("unit_price"))
            )
            
            comp_issues = issues.filter(component_name=comp)
            issued = comp_issues.aggregate(
                total_qty=Sum("qty_issued")
            )

            issued_items_details = []
            total_issued_qty = 0
            total_issued_value = Decimal(0)
            
            for issue in comp_issues:
                if issue.qty_issued > 0:
                    unit_price = 0
                    if issue.unit_price_at_issue and issue.unit_price_at_issue > 0:
                        unit_price = float(issue.unit_price_at_issue)
                    else:
                        stock = OverallStock.objects.filter(
                            component_name=issue.component_name, 
                            uom=issue.uom
                        ).first()
                        if stock and stock.average_price > 0:
                            unit_price = float(stock.average_price)
                    
                    issue_value = issue.qty_issued * unit_price
                    total_issued_qty += issue.qty_issued
                    total_issued_value += Decimal(issue_value)
                    
                    issued_items_details.append({
                        "sin_no": issue.sin_no,
                        "issued_date": issue.issued_date.strftime("%Y-%m-%d") if issue.issued_date else "N/A",
                        "qty_issued": issue.qty_issued,
                        "unit_price_at_issue": unit_price,
                        "total_value": issue_value,
                        "issued_by": issue.issued_by,
                        "uom": issue.uom
                    })

            issued_unit_price = 0
            if total_issued_qty > 0:
                issued_unit_price = float(total_issued_value / Decimal(total_issued_qty))

            has_activity = (
                (received["total_qty"] or 0) > 0 or
                (issued["total_qty"] or 0) > 0 or
                len(issued_items_details) > 0
            )

            if has_activity:
                detail_list.append({
                    "component_name": comp,
                    "received_qty": received["total_qty"] or 0,
                    "unit_price": float(received["avg_price"] or 0),   
                    "total_received_value": float(received["total_value"] or 0),
                    "issued_qty": issued["total_qty"] or 0,
                    "issued_unit_price": issued_unit_price,  
                    "issued_cost": float(total_issued_value),
                    "total_sales_value": 0,
                    "issued_items": issued_items_details,
                })

        return JsonResponse({
            "success": True,
            "report_type": report_type,
            "date_or_month": date_str or month_str,
            "total_sales_value": float(total_sales_value),  
            "components": detail_list,
            "debug_info": {
                "query_date": date_str,
                "total_issues_found": issues.count(),
                "issues_details": list(issues.values('sin_no', 'component_name', 'qty_issued', 'issued_date'))
            }
        }, status=200)

    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)

@csrf_exempt
def filter_consolidated_report(request):
    """
    Returns filtered consolidated report by day, week, month, or year.
    Only returns periods that actually have data.
    """
    try:
        if request.method != "POST":
            return JsonResponse({"success": False, "message": "Invalid method"}, status=405)

        data = json.loads(request.body)
        report_type = data.get("report_type", "day")
        report_list = []
        today = timezone.now().date()

        def is_future_date(date):
            """Check if date is in future"""
            return date > today
        
        def get_date_range_months(start_month_str, end_month_str):
            """Convert month strings to proper date range - supports both 'August 2025' and '2025-08' formats"""
            try:
                start_date = datetime.strptime(start_month_str, "%B %Y").replace(day=1).date()
            except ValueError:
                try:
                    start_date = datetime.strptime(start_month_str, "%Y-%m").replace(day=1).date()
                except ValueError:
                    raise ValueError(f"Invalid month format: {start_month_str}. Use 'August 2025' or '2025-08'")

            try:
                end_date = datetime.strptime(end_month_str, "%B %Y").replace(day=1).date()
            except ValueError:
                try:
                    end_date = datetime.strptime(end_month_str, "%Y-%m").replace(day=1).date()
                except ValueError:
                    raise ValueError(f"Invalid month format: {end_month_str}. Use 'August 2025' or '2025-08'")

            next_month = end_date.replace(day=28) + timedelta(days=4)
            end_date = next_month - timedelta(days=next_month.day)
            
                
            return start_date, end_date

        if report_type == "day":
            start_date_str = data.get("start_date")
            end_date_str = data.get("end_date", start_date_str)

            if not start_date_str:
                return JsonResponse({"success": False, "message": "start_date is required for day filter"}, status=400)

            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date() if end_date_str != start_date_str else start_date

            if is_future_date(start_date) or is_future_date(end_date):
                return JsonResponse({
                    "success": False,
                    "message": "The date you have entered is in the future and report is not yet available."
                }, status=400)

            if start_date > end_date:
                return JsonResponse({
                    "success": False,
                    "message": "Start date cannot be after end date."
                }, status=400)

            dates_with_transactions = set()
            
            receipt_dates = MaterialReceipt.objects.filter(
                created_at__date__range=[start_date, end_date]
            ).values_list('created_at__date', flat=True).distinct()
            dates_with_transactions.update(receipt_dates)
            
            issue_dates = StoresIssueNote.objects.filter(
                issued_date__range=[start_date, end_date],
                qty_issued__gt=0
            ).values_list('issued_date', flat=True).distinct()
            dates_with_transactions.update(issue_dates)
            
            sales_dates = PurchaseOrder.objects.filter(
                created_on__date__range=[start_date, end_date]
            ).values_list('created_on__date', flat=True).distinct()
            dates_with_transactions.update(sales_dates)

            for date in dates_with_transactions:
                if start_date <= date <= end_date:
                    update_or_create_daily_report(date)

            queryset = DailyInventoryReport.objects.filter(
                report_date__range=[start_date, end_date]
            ).filter(
                Q(total_stock_received_qty__gt=0) |
                Q(total_stock_received_value__gt=0) |
                Q(total_stock_issued_qty__gt=0) |
                Q(total_sales_value__gt=0) |
                Q(total_cost__gt=0) |
                Q(profit_or_loss__gt=0)
            ).order_by("report_date")

            if not queryset.exists():
                date_range_str = f"{start_date_str} to {end_date_str}" if start_date_str != end_date_str else start_date_str
                return JsonResponse({
                    "success": False, 
                    "message": f"No data found for {date_range_str}"
                }, status=404)

            for idx, report in enumerate(queryset, start=1):
                report_list.append({
                    "s_no": idx,
                    "period": report.report_date.strftime("%Y-%m-%d"),
                    "total_stock_received_qty": report.total_stock_received_qty,
                    "total_stock_received_value": float(report.total_stock_received_value),
                    "total_stock_issued_qty": report.total_stock_issued_qty,
                    "total_sales_value": float(report.total_sales_value),
                    "total_cost": float(report.total_cost),
                    "profit_or_loss": float(report.profit_or_loss),
                })

        elif report_type == "week":
            start_date_str = data.get("start_date")
            end_date_str = data.get("end_date", start_date_str)

            if not start_date_str:
                return JsonResponse({"success": False, "message": "start_date is required for week filter"}, status=400)

            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date() if end_date_str != start_date_str else start_date

            if is_future_date(start_date) or is_future_date(end_date):
                return JsonResponse({
                    "success": False,
                    "message": "The date range you have entered contains future dates and report is not yet available."
                }, status=400)

            if start_date > end_date:
                return JsonResponse({
                    "success": False,
                    "message": "Start date cannot be after end date."
                }, status=400)

            dates_with_transactions = set()
            
            receipt_dates = MaterialReceipt.objects.filter(
                created_at__date__range=[start_date, end_date]
            ).values_list('created_at__date', flat=True).distinct()
            dates_with_transactions.update(receipt_dates)
            
            issue_dates = StoresIssueNote.objects.filter(
                issued_date__range=[start_date, end_date],
                qty_issued__gt=0
            ).values_list('issued_date', flat=True).distinct()
            dates_with_transactions.update(issue_dates)
            
            sales_dates = PurchaseOrder.objects.filter(
                created_on__date__range=[start_date, end_date]
            ).values_list('created_on__date', flat=True).distinct()
            dates_with_transactions.update(sales_dates)

            for date in dates_with_transactions:
                if start_date <= date <= end_date:
                    update_or_create_daily_report(date)

            queryset = DailyInventoryReport.objects.filter(
                report_date__range=[start_date, end_date]
            )
            
            if not queryset.exists():
                date_range_str = f"{start_date_str} to {end_date_str}" if start_date_str != end_date_str else start_date_str
                return JsonResponse({
                    "success": False, 
                    "message": f"No data found for the week range {date_range_str}"
                }, status=404)

            reports = queryset.annotate(week=TruncWeek('report_date')).values('week').annotate(
                total_stock_received_qty=Sum('total_stock_received_qty'),
                total_stock_received_value=Sum('total_stock_received_value'),
                total_stock_issued_qty=Sum('total_stock_issued_qty'),
                total_sales_value=Sum('total_sales_value'),
                total_cost=Sum('total_cost'),
                profit_or_loss=Sum('profit_or_loss')
            ).filter(
                Q(total_stock_received_qty__gt=0) |
                Q(total_stock_received_value__gt=0) |
                Q(total_stock_issued_qty__gt=0) |
                Q(total_sales_value__gt=0) |
                Q(total_cost__gt=0) |
                Q(profit_or_loss__gt=0)
            ).order_by('week')

            if not reports.exists():
                date_range_str = f"{start_date_str} to {end_date_str}" if start_date_str != end_date_str else start_date_str
                return JsonResponse({
                    "success": False, 
                    "message": f"No data found for the week range {date_range_str}"
                }, status=404)

            for idx, report in enumerate(reports, start=1):
                week_num = report['week'].isocalendar()[1]
                year = report['week'].year
                report_list.append({
                    "s_no": idx,
                    "period": f"Week {week_num}, {year}",
                    "total_stock_received_qty": report['total_stock_received_qty'] or 0,
                    "total_stock_received_value": float(report['total_stock_received_value'] or 0),
                    "total_stock_issued_qty": report['total_stock_issued_qty'] or 0,
                    "total_sales_value": float(report['total_sales_value'] or 0),
                    "total_cost": float(report['total_cost'] or 0),
                    "profit_or_loss": float(report['profit_or_loss'] or 0),
                })

        elif report_type == "month":
            start_month_str = data.get("start_month")
            end_month_str = data.get("end_month", start_month_str)

            if not start_month_str:
                return JsonResponse({"success": False, "message": "start_month is required for month filter"}, status=400)

            start_date, end_date = get_date_range_months(start_month_str, end_month_str)

            if is_future_date(start_date):
                return JsonResponse({
                    "success": False,
                    "message": "The start month you have entered is in the future and report is not yet available."
                }, status=400)

            dates_with_transactions = set()
            
            receipt_dates = MaterialReceipt.objects.filter(
                created_at__date__range=[start_date, end_date]
            ).values_list('created_at__date', flat=True).distinct()
            dates_with_transactions.update(receipt_dates)
            
            issue_dates = StoresIssueNote.objects.filter(
                issued_date__range=[start_date, end_date],
                qty_issued__gt=0
            ).values_list('issued_date', flat=True).distinct()
            dates_with_transactions.update(issue_dates)
            
            sales_dates = PurchaseOrder.objects.filter(
                created_on__date__range=[start_date, end_date]
            ).values_list('created_on__date', flat=True).distinct()
            dates_with_transactions.update(sales_dates)

            for date in dates_with_transactions:
                if start_date <= date <= end_date:
                    update_or_create_daily_report(date)

            queryset = DailyInventoryReport.objects.filter(
                report_date__range=[start_date, end_date]
            )
            
            if not queryset.exists():
                month_range_str = f"{start_month_str} to {end_month_str}" if start_month_str != end_month_str else start_month_str
                return JsonResponse({
                    "success": False, 
                    "message": f"No data found for {month_range_str}"
                }, status=404)

            reports = queryset.annotate(month=TruncMonth('report_date')).values('month').annotate(
                total_stock_received_qty=Sum('total_stock_received_qty'),
                total_stock_received_value=Sum('total_stock_received_value'),
                total_stock_issued_qty=Sum('total_stock_issued_qty'),
                total_sales_value=Sum('total_sales_value'),
                total_cost=Sum('total_cost'),
                profit_or_loss=Sum('profit_or_loss')
            ).filter(
                Q(total_stock_received_qty__gt=0) |
                Q(total_stock_received_value__gt=0) |
                Q(total_stock_issued_qty__gt=0) |
                Q(total_sales_value__gt=0) |
                Q(total_cost__gt=0) |
                Q(profit_or_loss__gt=0)
            ).order_by('month')

            if not reports.exists():
                month_range_str = f"{start_month_str} to {end_month_str}" if start_month_str != end_month_str else start_month_str
                return JsonResponse({
                    "success": False, 
                    "message": f"No data found for {month_range_str}"
                }, status=404)

            for idx, report in enumerate(reports, start=1):
                report_list.append({
                    "s_no": idx,
                    "period": report['month'].strftime("%B %Y"),
                    "total_stock_received_qty": report['total_stock_received_qty'] or 0,
                    "total_stock_received_value": float(report['total_stock_received_value'] or 0),
                    "total_stock_issued_qty": report['total_stock_issued_qty'] or 0,
                    "total_sales_value": float(report['total_sales_value'] or 0),
                    "total_cost": float(report['total_cost'] or 0),
                    "profit_or_loss": float(report['profit_or_loss'] or 0),
                })

        elif report_type == "year":
            start_year = data.get("start_year")
            end_year = data.get("end_year", start_year)

            if not start_year:
                return JsonResponse({"success": False, "message": "start_year is required for year filter"}, status=400)

            start_year = int(start_year)
            end_year = int(end_year) if end_year != start_year else start_year

            if start_year > today.year:
                return JsonResponse({
                    "success": False,
                    "message": "The start year you have entered is in the future and report is not yet available."
                }, status=400)

            if end_year > today.year:
                return JsonResponse({
                    "success": False,
                    "message": "The end year you have entered is in the future and report is not yet available."
                }, status=400)

            if start_year > end_year:
                return JsonResponse({
                    "success": False,
                    "message": "Start year cannot be after end year."
                }, status=400)

            start_date = datetime(start_year, 1, 1).date()
            end_date = datetime(end_year, 12, 31).date()
            
            if end_date > today:
                end_date = today

            dates_with_transactions = set()
            
            receipt_dates = MaterialReceipt.objects.filter(
                created_at__date__range=[start_date, end_date]
            ).values_list('created_at__date', flat=True).distinct()
            dates_with_transactions.update(receipt_dates)
            
            issue_dates = StoresIssueNote.objects.filter(
                issued_date__range=[start_date, end_date],
                qty_issued__gt=0
            ).values_list('issued_date', flat=True).distinct()
            dates_with_transactions.update(issue_dates)
            
            sales_dates = PurchaseOrder.objects.filter(
                created_on__date__range=[start_date, end_date]
            ).values_list('created_on__date', flat=True).distinct()
            dates_with_transactions.update(sales_dates)

            for date in dates_with_transactions:
                if start_date <= date <= end_date:
                    update_or_create_daily_report(date)

            queryset = DailyInventoryReport.objects.filter(
                report_date__range=[start_date, end_date]
            )
            
            if not queryset.exists():
                year_range_str = f"{start_year} to {end_year}" if start_year != end_year else str(start_year)
                return JsonResponse({
                    "success": False, 
                    "message": f"No data found for {year_range_str}"
                }, status=404)

            reports = queryset.annotate(year=TruncYear('report_date')).values('year').annotate(
                total_stock_received_qty=Sum('total_stock_received_qty'),
                total_stock_received_value=Sum('total_stock_received_value'),
                total_stock_issued_qty=Sum('total_stock_issued_qty'),
                total_sales_value=Sum('total_sales_value'),
                total_cost=Sum('total_cost'),
                profit_or_loss=Sum('profit_or_loss')
            ).filter(
                Q(total_stock_received_qty__gt=0) |
                Q(total_stock_received_value__gt=0) |
                Q(total_stock_issued_qty__gt=0) |
                Q(total_sales_value__gt=0) |
                Q(total_cost__gt=0) |
                Q(profit_or_loss__gt=0)
            ).order_by('year')

            if not reports.exists():
                year_range_str = f"{start_year} to {end_year}" if start_year != end_year else str(start_year)
                return JsonResponse({
                    "success": False, 
                    "message": f"No data found for {year_range_str}"
                }, status=404)

            for idx, report in enumerate(reports, start=1):
                report_list.append({
                    "s_no": idx,
                    "period": str(report['year'].year),
                    "total_stock_received_qty": report['total_stock_received_qty'] or 0,
                    "total_stock_received_value": float(report['total_stock_received_value'] or 0),
                    "total_stock_issued_qty": report['total_stock_issued_qty'] or 0,
                    "total_sales_value": float(report['total_sales_value'] or 0),
                    "total_cost": float(report['total_cost'] or 0),
                    "profit_or_loss": float(report['profit_or_loss'] or 0),
                })

        else:
            return JsonResponse({"success": False, "message": "Invalid report_type"}, status=400)

        return JsonResponse({"success": True, "data": report_list}, status=200)

    except ValueError as e:
        return JsonResponse({"success": False, "message": f"Invalid date format: {str(e)}"}, status=400)
    except Exception as e:
        import traceback
        return JsonResponse({"success": False, "message": f"Error: {str(e)}\nTraceback: {traceback.format_exc()}"}, status=500)


def get_consolidated_reports(start_date, end_date, report_type):
    """
    Fetch consolidated reports based on date range and report type
    """
    today = timezone.now().date()
    
    if not start_date:
        start_date = today - timedelta(days=30)
    if not end_date:
        end_date = today
    
    if isinstance(start_date, str):
        start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
    if isinstance(end_date, str):
        end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
    
    if report_type == "day":
        return DailyInventoryReport.objects.filter(
            report_date__range=[start_date, end_date]
        ).order_by("report_date")
    elif report_type == "month":
        return DailyInventoryReport.objects.filter(
            report_date__range=[start_date, end_date]
        ).annotate(month=TruncMonth('report_date')).values('month').annotate(
            total_stock_received_qty=Sum('total_stock_received_qty'),
            total_stock_received_value=Sum('total_stock_received_value'),
            total_stock_issued_qty=Sum('total_stock_issued_qty'),
            total_sales_value=Sum('total_sales_value'),
            total_cost=Sum('total_cost'),
            profit_or_loss=Sum('profit_or_loss')
        ).order_by('month')
    else:
        return DailyInventoryReport.objects.filter(
            report_date__range=[start_date, end_date]
        )

def generate_pie_charts_data(reports):
    """
    Generate pie chart data from reports - handles both model objects and dictionaries
    """
    total_received_value = 0
    total_sales_value = 0
    total_cost = 0
    total_received_qty = 0
    total_issued_qty = 0
    
    for report in reports:
        if isinstance(report, dict):
            total_received_value += float(report.get('total_stock_received_value', 0) or 0)
            total_sales_value += float(report.get('total_sales_value', 0) or 0)
            total_cost += float(report.get('total_cost', 0) or 0)
            total_received_qty += report.get('total_stock_received_qty', 0) or 0
            total_issued_qty += report.get('total_stock_issued_qty', 0) or 0
        else:
            total_received_value += float(report.total_stock_received_value)
            total_sales_value += float(report.total_sales_value)
            total_cost += float(report.total_cost)
            total_received_qty += report.total_stock_received_qty
            total_issued_qty += report.total_stock_issued_qty
    
    return {
        "stock_value": [
            {"name": "Received Stock Value", "value": total_received_value},
            {"name": "Sales Value", "value": total_sales_value},
            {"name": "Remaining Stock Value", "value": max(0, total_received_value - total_sales_value)}
        ],
        "profit_loss": [
            {"name": "Sales Revenue", "value": total_sales_value},
            {"name": "Cost of Goods", "value": total_cost},
            {"name": "Net Profit/Loss", "value": total_sales_value - total_cost}
        ],
        "stock_quantity": [
            {"name": "Received Quantity", "value": total_received_qty},
            {"name": "Issued Quantity", "value": total_issued_qty},
            {"name": "Available Quantity", "value": max(0, total_received_qty - total_issued_qty)}
        ]
    }

def generate_bar_charts_data(reports):
    """
    Generate bar chart data from reports - handles both model objects and dictionaries
    """
    total_received_value = 0
    total_sales_value = 0
    total_cost = 0
    total_received_qty = 0
    total_issued_qty = 0
    
    for report in reports:
        if isinstance(report, dict):
            total_received_value += float(report.get('total_stock_received_value', 0) or 0)
            total_sales_value += float(report.get('total_sales_value', 0) or 0)
            total_cost += float(report.get('total_cost', 0) or 0)
            total_received_qty += report.get('total_stock_received_qty', 0) or 0
            total_issued_qty += report.get('total_stock_issued_qty', 0) or 0
        else:
            total_received_value += float(report.total_stock_received_value)
            total_sales_value += float(report.total_sales_value)
            total_cost += float(report.total_cost)
            total_received_qty += report.total_stock_received_qty
            total_issued_qty += report.total_stock_issued_qty
    
    monthly_data = []
    for report in reports:
        if isinstance(report, dict):
            monthly_data.append({
                "month": report['month'].strftime("%B %Y"),
                "stock_received": float(report.get('total_stock_received_value', 0) or 0),
                "sales": float(report.get('total_sales_value', 0) or 0),
                "cost": float(report.get('total_cost', 0) or 0)
            })
        else:
            month_str = report.report_date.strftime("%B %Y")
            existing_month = next((item for item in monthly_data if item["month"] == month_str), None)
            if existing_month:
                existing_month["stock_received"] += float(report.total_stock_received_value)
                existing_month["sales"] += float(report.total_sales_value)
                existing_month["cost"] += float(report.total_cost)
            else:
                monthly_data.append({
                    "month": month_str,
                    "stock_received": float(report.total_stock_received_value),
                    "sales": float(report.total_sales_value),
                    "cost": float(report.total_cost)
                })
    
    return {
        "stock_value": [
            {"name": "Received Stock", "value": total_received_value},
            {"name": "Sales", "value": total_sales_value},
            {"name": "Remaining Stock", "value": max(0, total_received_value - total_sales_value)}
        ],
        "profit_loss": [
            {"name": "Sales Revenue", "value": total_sales_value},
            {"name": "Cost of Goods", "value": total_cost},
            {"name": "Net Profit/Loss", "value": total_sales_value - total_cost}
        ],
        "stock_quantity": [
            {"name": "Received Qty", "value": total_received_qty},
            {"name": "Issued Qty", "value": total_issued_qty},
            {"name": "Available Qty", "value": max(0, total_received_qty - total_issued_qty)}
        ],
        "monthly_comparison": monthly_data
    }

@csrf_exempt
def consolidated_report_charts(request):
    try:
        data = json.loads(request.body)
        report_type = data.get("report_type", "day")
        chart_type = data.get("chart_type", "all")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        
        today = timezone.now().date()
        
        if not start_date:
            receipt_min = MaterialReceipt.objects.aggregate(min_date=Min('created_at__date'))['min_date']
            issue_min = StoresIssueNote.objects.aggregate(min_date=Min('issued_date'))['min_date']
            sales_min = PurchaseOrder.objects.aggregate(min_date=Min('created_on__date'))['min_date']
            all_min_dates = [d for d in [receipt_min, issue_min, sales_min] if d is not None]
            start_date = min(all_min_dates) if all_min_dates else (today - timedelta(days=30))
        
        if not end_date:
            end_date = today

        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        if isinstance(end_date, str):
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date()

        if report_type == "day":
            reports = list(DailyInventoryReport.objects.filter(
                report_date__range=[start_date, end_date]
            ).order_by("report_date"))
        elif report_type == "month":
            reports = list(DailyInventoryReport.objects.filter(
                report_date__range=[start_date, end_date]
            ).annotate(month=TruncMonth('report_date')).values('month').annotate(
                total_stock_received_qty=Sum('total_stock_received_qty'),
                total_stock_received_value=Sum('total_stock_received_value'),
                total_stock_issued_qty=Sum('total_stock_issued_qty'),
                total_sales_value=Sum('total_sales_value'),
                total_cost=Sum('total_cost'),
                profit_or_loss=Sum('profit_or_loss')
            ).order_by('month'))
            reports = list(DailyInventoryReport.objects.filter(
                report_date__range=[start_date, end_date]
            ).order_by("report_date"))
        
        response_data = {
            "success": True,
            "time_period": f"{start_date} to {end_date}",
            "report_type": report_type,
            "total_reports": len(reports)
        }
        
        if chart_type in ["pie", "all"] and reports:
            response_data["pie_charts"] = generate_pie_charts_data(reports)
            
        if chart_type in ["bar", "all"] and reports:  
            response_data["bar_charts"] = generate_bar_charts_data(reports)
        
        if not reports:
            response_data["message"] = "No data found for the selected period"
            
        return JsonResponse(response_data)
        
    except Exception as e:
        import traceback
        return JsonResponse({"success": False, "message": f"Error: {str(e)}\nTraceback: {traceback.format_exc()}"})

@csrf_exempt
def view_mrr_report(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        data = json.loads(request.body or "{}")
        role_id = data.get("role_id")

      
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            return JsonResponse({"error": "Invalid role_id"}, status=400)


       
        inspected_materials = MaterialReceipt.objects.all().values(
            "id",
            "part_number",
            "component_name",
            "quantity",
            "accepted_quantity",
            "unit_price",
            "inspection_status",
            "created_at",
            "quality_incharge",
        )

        mrr_list = []

        for item in inspected_materials:
            total_price = (item["accepted_quantity"] or 0) * float(item["unit_price"] or 0)

            
            inspected_by = "-"
            inspected_by_id = None
            if item["quality_incharge"]:
                try:
                    qc_role = Role.objects.get(id=item["quality_incharge"])
                    inspected_by = f"{qc_role.role_type.title()} - {qc_role.first_name} {qc_role.last_name}"
                    inspected_by_id = qc_role.id
                except Role.DoesNotExist:
                    inspected_by = "-"
                    inspected_by_id = None

            mrr_list.append({
                "id": item["id"],
                "part_number": item["part_number"],
                "component_name": item["component_name"],
                "quantity": item["quantity"],
                "accepted_quantity": item["accepted_quantity"],
                "unit_price": float(item["unit_price"]) if item["unit_price"] else 0.0,
                "total_price": round(total_price, 2),
                "inspection_status": item["inspection_status"].capitalize() if item["inspection_status"] else "-",
                "inspected_by_id": inspected_by_id,
                "inspected_by": inspected_by,
                "created_at": item["created_at"].strftime("%Y-%m-%d %H:%M"),
            })

        total_accepted_qty = sum(
            item["accepted_quantity"] for item in inspected_materials if item["accepted_quantity"]
        )

        return JsonResponse({
            "success": True,
            "total_accepted_quantity": total_accepted_qty,
            "mrr_list": mrr_list,
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def filter_material_receipt(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        data = json.loads(request.body)

        month = data.get("month")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        year = data.get("year")
        date = data.get("date")
        start_month = data.get("start_month")
        end_month = data.get("end_month")
        start_year = data.get("start_year")
        end_year = data.get("end_year")

        receipts = MaterialReceipt.objects.all()
        month_name = None

        if date:
            specific_date = datetime.strptime(date, "%Y-%m-%d").date()
            receipts = receipts.filter(invoice_date=specific_date)
            month_name = specific_date.strftime("%d %b %Y")

        elif year:
            year = int(year)
            receipts = receipts.filter(invoice_date__year=year)
            month_name = f"Year {year}"

        elif month:
            if "-" in str(month):
                year, month_num = map(int, month.split("-"))
            else:
                year = datetime.now().year
                month_num = int(month)
            receipts = receipts.filter(invoice_date__year=year, invoice_date__month=month_num)
            month_name = f"{calendar.month_name[month_num]} {year}"

        elif start_date and end_date:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
            receipts = receipts.filter(invoice_date__range=[start, end])
            month_name = f"{start.strftime('%d %b %Y')} to {end.strftime('%d %b %Y')}"

        elif start_month and end_month:
            start_month = int(start_month)
            end_month = int(end_month)
            start_year_val = int(start_year) if start_year else datetime.now().year
            end_year_val = int(end_year) if end_year else datetime.now().year
            start_period = datetime(start_year_val, start_month, 1).date()
            last_day = calendar.monthrange(end_year_val, end_month)[1]
            end_period = datetime(end_year_val, end_month, last_day).date()
            receipts = receipts.filter(invoice_date__range=[start_period, end_period])
            month_name = f"{calendar.month_name[start_month]} {start_year_val} to {calendar.month_name[end_month]} {end_year_val}"

        elif start_year and end_year:
            start_year = int(start_year)
            end_year = int(end_year)
            receipts = receipts.filter(invoice_date__year__gte=start_year, invoice_date__year__lte=end_year)
            month_name = f"Year {start_year} to {end_year}"

        else:
            return JsonResponse({
                "error": "Please provide at least one filter."
            }, status=400)

        data_list = []
        for r in receipts:
            data_list.append({
                "id": r.id,
                "part_number": r.part_number,
                "hsn_code": r.hsn_code,
                "component_name": r.component_name,
                "supplier": r.supplier,
                "invoice_no": r.invoice_no,
                "invoice_date": str(r.invoice_date),
                "po_no": r.po_no,
                "po_date": str(r.po_date) if r.po_date else None,
                "uom": r.uom,
                "quantity": r.quantity,
                "unit_price": str(r.unit_price),
                "total_price": str(r.total_price),
                "taxes": str(r.taxes),
                "status": r.status,
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else None,

                "inspection_status": getattr(r, "inspection_status", None),
                "accepted_quantity": getattr(r, "accepted_quantity", None),
                "rejected_quantity": getattr(r, "rejected_quantity", None),
                "quality_incharge_id": getattr(r, "quality_incharge", None),

                "inspected_on": (
                    r.updated_at.strftime("%Y-%m-%d %H:%M:%S")
                    if getattr(r, "updated_at", None) else None
                )
            })


        return JsonResponse({
            "success": True,
            "filters_applied": {
                "date": date,
                "month": month_name,
                "year": str(year) if year else None,
                "start_date": start_date,
                "end_date": end_date,
                "start_month": start_month,
                "end_month": end_month,
                "start_year": start_year if start_year else None,
                "end_year": end_year if end_year else None
            },
            "total_records": receipts.count(),
            "data": data_list
        }, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)



    


@csrf_exempt
def filter_overall_stock(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        data = json.loads(request.body or "{}")
        role_id = data.get("role_id")

        start_date = data.get("start_date")
        end_date = data.get("end_date")
        month_number = data.get("month")
        year = data.get("year")
        date = data.get("date")

        start_month = data.get("start_month")
        end_month = data.get("end_month")
        start_year = data.get("start_year")
        end_year = data.get("end_year")

        stocks = OverallStock.objects.all()
        month_display = None

        if date:
            try:
                single_date = datetime.strptime(date, "%Y-%m-%d").date()
                stocks = stocks.filter(created_at__date=single_date)
                month_display = single_date.strftime("%B %d, %Y")
            except ValueError:
                return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        elif year:
            try:
                year = int(year)
                stocks = stocks.filter(created_at__year=year)
                month_display = f"Year {year}"
            except ValueError:
                return JsonResponse({"error": "Invalid year format. Use YYYY (e.g., 2025)."}, status=400)

        elif month_number:
            try:
                month_number = int(month_number)
                if not (1 <= month_number <= 12):
                    return JsonResponse({"error": "Invalid month. Must be 1–12."}, status=400)
            except ValueError:
                return JsonResponse({"error": "Month must be a number 1–12."}, status=400)

            current_year = int(year) if year else datetime.now().year
            stocks = stocks.filter(
                created_at__month=month_number,
                created_at__year=current_year
            )
            month_display = f"{calendar.month_name[month_number]} {current_year}"

        elif start_date and end_date:
            try:
                start_date_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
                end_date_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
            except ValueError:
                return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

            stocks = stocks.filter(created_at__date__range=[start_date_dt, end_date_dt])
            month_display = f"{start_date_dt.strftime('%d %b %Y')} to {end_date_dt.strftime('%d %b %Y')}"

        elif start_month and end_month:
            try:
                start_month = int(start_month)
                end_month = int(end_month)

                start_year_val = int(start_year) if start_year else None
                end_year_val = int(end_year) if end_year else None

                filter_start_year = start_year_val or datetime.now().year
                filter_end_year = end_year_val or datetime.now().year

                start_period = datetime(filter_start_year, start_month, 1).date()
                last_day = calendar.monthrange(filter_end_year, end_month)[1]
                end_period = datetime(filter_end_year, end_month, last_day).date()

                stocks = stocks.filter(created_at__date__range=[start_period, end_period])

                if start_year_val or end_year_val:
                    month_display = f"{calendar.month_name[start_month]} {filter_start_year} to {calendar.month_name[end_month]} {filter_end_year}"
                else:
                    month_display = f"{calendar.month_name[start_month]} to {calendar.month_name[end_month]}"
            except ValueError:
                return JsonResponse({"error": "Invalid start/end month or year format."}, status=400)

        elif start_year and end_year:
            try:
                start_year = int(start_year)
                end_year = int(end_year)
                stocks = stocks.filter(created_at__year__gte=start_year, created_at__year__lte=end_year)
                month_display = f"Year {start_year} to {end_year}"
            except ValueError:
                return JsonResponse({"error": "Invalid start/end year format."}, status=400)

        else:
            return JsonResponse({
                "error": "Please provide at least one filter: 'date', 'month', 'year', 'start_date & end_date', 'start_month & end_month', or 'start_year & end_year'."
            }, status=400)

        grouped_stocks = stocks.values(
            "component_name", "uom", "role__id", "role__role_type"
        ).annotate(
            total_quantity=Sum("total_quantity"),
            average_price=Avg("average_price"),
            total_value=Sum("total_value")
        )

        data_list = [{
            "component_name": s["component_name"],
            "uom": s["uom"],
            "total_quantity": s["total_quantity"],
            "average_price": float(s["average_price"] or 0),
            "total_value": float(s["total_value"] or 0),
            "role_id": s["role__id"],
            "role_type": s["role__role_type"]
        } for s in grouped_stocks]

        return JsonResponse({
            "success": True,
            "filters_applied": {
                "date": date,
                "month": month_display,
                "year": str(year) if year else None,
                "start_date": start_date,
                "end_date": end_date,
                "start_month": start_month,
                "end_month": end_month,
                "start_year": start_year if start_year else None,
                "end_year": end_year if end_year else None
            },
            "total_records": len(data_list),
            "data": data_list
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format."}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)


@csrf_exempt
def filter_product_stock(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        data = json.loads(request.body or "{}")

        start_date = data.get("start_date")
        end_date = data.get("end_date")
        month_number = data.get("month")
        year = data.get("year")
        date = data.get("date")  
        start_month = data.get("start_month")
        end_month = data.get("end_month")
        start_year = data.get("start_year")
        end_year = data.get("end_year")

        product_stocks = ProductStock.objects.none()
        filters_applied = {
            "created_date": None,
            "month": None,
            "year": None,
            "start_date": None,
            "end_date": None,
            "start_month": None,
            "end_month": None,
            "start_year": None,
            "end_year": None
        }

        if start_month and end_month:
            try:
                start_month = int(start_month)
                end_month = int(end_month)
                start_year_int = int(start_year) if start_year else datetime.now().year
                end_year_int = int(end_year) if end_year else datetime.now().year

                start_period = datetime(start_year_int, start_month, 1).date()
                last_day = calendar.monthrange(end_year_int, end_month)[1]
                end_period = datetime(end_year_int, end_month, last_day).date()

                product_stocks = ProductStock.objects.filter(
                    created_at__date__range=[start_period, end_period]
                ).order_by("-created_at")

                filters_applied.update({
                    "start_month": start_month,
                    "end_month": end_month,
                    "start_year": start_year_int,
                    "end_year": end_year_int
                })
            except ValueError:
                return JsonResponse({"error": "Invalid start/end month or year format."}, status=400)

        elif date:
            try:
                single_date = datetime.strptime(date, "%Y-%m-%d").date()
                product_stocks = ProductStock.objects.filter(
                    created_at__date=single_date
                ).order_by("-created_at")
                filters_applied["created_date"] = date
            except ValueError:
                return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        elif month_number and year:
            try:
                month_number = int(month_number)
                year = int(year)
                if not (1 <= month_number <= 12):
                    return JsonResponse({"error": "Invalid month. Must be 1-12."}, status=400)
            except ValueError:
                return JsonResponse({"error": "Month and year must be numbers."}, status=400)

            product_stocks = ProductStock.objects.filter(
                created_at__month=month_number,
                created_at__year=year
            ).order_by("-created_at")

            filters_applied["month"] = calendar.month_name[month_number]
            filters_applied["year"] = str(year)

        elif month_number:
            try:
                month_number = int(month_number)
                if not (1 <= month_number <= 12):
                    return JsonResponse({"error": "Invalid month. Must be 1-12."}, status=400)
            except ValueError:
                return JsonResponse({"error": "Month must be a number."}, status=400)

            current_year = datetime.now().year
            product_stocks = ProductStock.objects.filter(
                created_at__month=month_number,
                created_at__year=current_year
            ).order_by("-created_at")

            filters_applied["month"] = calendar.month_name[month_number]
            filters_applied["year"] = str(current_year)

        elif year:
            try:
                year = int(year)
            except ValueError:
                return JsonResponse({"error": "Year must be a number."}, status=400)

            product_stocks = ProductStock.objects.filter(
                created_at__year=year
            ).order_by("-created_at")

            filters_applied["year"] = str(year)

        elif start_date and end_date:
            try:
                start_date = datetime.strptime(start_date, "%Y-%m-%d")
                end_date = datetime.strptime(end_date, "%Y-%m-%d")
            except ValueError:
                return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

            product_stocks = ProductStock.objects.filter(
                created_at__date__range=[start_date, end_date]
            ).order_by("-created_at")

            filters_applied["start_date"] = start_date
            filters_applied["end_date"] = end_date

        elif start_year and end_year:
            try:
                start_year_int = int(start_year)
                end_year_int = int(end_year)
                start_period = datetime(start_year_int, 1, 1).date()
                end_period = datetime(end_year_int, 12, 31).date()

                product_stocks = ProductStock.objects.filter(
                    created_at__date__range=[start_period, end_period]
                ).order_by("-created_at")

                filters_applied["start_year"] = start_year_int
                filters_applied["end_year"] = end_year_int
            except ValueError:
                return JsonResponse({"error": "Invalid start_year or end_year."}, status=400)

        else:
            return JsonResponse({
                "error": "Provide 'date', 'month', 'year', 'start_date & end_date', 'start_month & end_month (& start_year & end_year)', or 'start_year & end_year' to filter."
            }, status=400)

        if not product_stocks.exists():
            return JsonResponse({
                "success": True,
                "filters_applied": filters_applied,
                "total_records": 0,
                "data": []
            }, status=200)

        response_list = []
        for stock in product_stocks:
            month_name = stock.created_at.strftime("%B %Y") if stock.created_at else ""
            response_list.append({
                "id": stock.id,
                "component_name": stock.description or "",
                "description": stock.description or "",
                "specifications": stock.specifications or "",
                "uom": stock.uom or "",
                "qty_required_per_drone": stock.qty_required_per_drone or 0,
                "part_number": stock.part_number or "",
                "country_of_origin": stock.country_of_origin or "",
                "qty_in_stock": stock.qty_in_stock or 0,
                "basic_price": str(stock.basic_price or 0),
                "gst": str(stock.gst or 0.0),
                "total_price_inc_gst": str(stock.total_price_inc_gst or 0),
                "remarks": stock.remarks or "",
                "month": month_name,
                "created_at": stock.created_at.strftime("%Y-%m-%d %H:%M:%S") if stock.created_at else "",
            })

        return JsonResponse({
            "success": True,
            "filters_applied": filters_applied,
            "total_records": len(response_list),
            "data": response_list
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format."}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)




    
@csrf_exempt
def filter_material_transfer_notes(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        data = json.loads(request.body or "{}")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        date = data.get("date")  
        month_number = data.get("month")
        year = data.get("year")

        start_month = data.get("start_month")
        end_month = data.get("end_month")
        start_year = data.get("start_year")
        end_year = data.get("end_year")

        mt_notes = MaterialTransferNote.objects.all().order_by('-id')
        filters_applied = {
            "month": None,
            "year": None,
            "start_date": None,
            "end_date": None,
            "month_range": None,
            "year_range": None,
            "date": None
        }

        if date:
            date = datetime.strptime(date, "%Y-%m-%d")
            mt_notes = mt_notes.filter(created_at__date=date)
            filters_applied["date"] = date

        elif year:
            year = int(year)
            mt_notes = mt_notes.filter(created_at__year=year)
            filters_applied["year"] = year

        elif month_number:
            month_number = int(month_number)
            selected_year = year if year else datetime.now().year
            mt_notes = mt_notes.filter(
                created_at__month=month_number,
                created_at__year=selected_year
            )
            filters_applied["month"] = f"{calendar.month_name[month_number]} {selected_year}"

        elif start_date and end_date:
            start_date = datetime.strptime(start_date, "%Y-%m-%d")
            end_date = datetime.strptime(end_date, "%Y-%m-%d")
            mt_notes = mt_notes.filter(created_at__date__range=[start_date, end_date])
            filters_applied["start_date"] = start_date
            filters_applied["end_date"] = end_date

        elif start_year and end_year:
            start_year = int(start_year)
            end_year = int(end_year)
            mt_notes = mt_notes.filter(created_at__year__range=[start_year, end_year])
            filters_applied["year_range"] = f"{start_year} - {end_year}"

        elif start_month and end_month:
            start_month = int(start_month)
            end_month = int(end_month)
            selected_year = year if year else datetime.now().year
            mt_notes = mt_notes.filter(
                created_at__month__gte=start_month,
                created_at__month__lte=end_month,
                created_at__year=selected_year
            )
            filters_applied["month_range"] = f"{calendar.month_name[start_month]} - {calendar.month_name[end_month]} {selected_year}"

        elif not (date or month_number or year or (start_date and end_date) or (start_year and end_year) or (start_month and end_month)):
            return JsonResponse({"error": "Provide at least one filter (date, date range, month, year, or their ranges)."}, status=400)

        if not mt_notes.exists():
            return JsonResponse({
                "success": True,
                "filters_applied": filters_applied,
                "total_records": 0,
                "data": []
            }, status=200)

        mt_notes_values = list(mt_notes.values('id', 'mtn_no', 'issued_by', 'authorized_by', 'received_by', 'created_at', 'role_id'))
        mt_ids = [mtn['id'] for mtn in mt_notes_values]

        items = MaterialItem.objects.filter(mtn_id__in=mt_ids).values(
            'id', 'item_name', 'uom', 'qty_transferred', 'remarks', 'mtn_id'
        )

        items_dict = {}
        for item in items:
            items_dict.setdefault(item['mtn_id'], []).append({
                'id': item['id'],
                'item_name': item['item_name'],
                'uom': item['uom'],
                "qty_transferred": str(int(item['qty_transferred'])) if item['qty_transferred'] == item['qty_transferred'].to_integral() else str(item['qty_transferred']),

                'remarks': item['remarks']
            })

        data_list = []
        for mtn in mt_notes_values:
            mtn['items'] = items_dict.get(mtn['id'], [])
            mtn['created_at'] = mtn['created_at'].strftime("%Y-%m-%d %H:%M:%S")
            mtn['month'] = datetime.strptime(mtn['created_at'], "%Y-%m-%d %H:%M:%S").strftime("%B %Y")
            data_list.append(mtn)

        return JsonResponse({
            "success": True,
            "filters_applied": filters_applied,
            "total_records": len(data_list),
            "data": data_list
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format."}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"An unexpected error occurred: {str(e)}"}, status=500)

@csrf_exempt
def filter_wip(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        data = json.loads(request.body or "{}")

        component_name = data.get("component_name")
        sin_no = data.get("sin_no")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        month_number = data.get("month")  
        year = data.get("year")     

        date = data.get("date")
        start_month = data.get("start_month")
        end_month = data.get("end_month")
        start_year = data.get("start_year")
        end_year = data.get("end_year")

        wip_queryset = WIP.objects.all()
        filters_applied = {
            "month": None, "year": None, "start_date": None, "end_date": None,
            "date": None, "month_range": None, "year_range": None
        }

        if component_name:
            wip_queryset = wip_queryset.filter(component_name__icontains=component_name)
        if sin_no:
            wip_queryset = wip_queryset.filter(sin_no=sin_no)

        if year:
            try:
                year = int(year)
            except ValueError:
                return JsonResponse({"error": "Year must be a valid integer (e.g. 2025)."}, status=400)
            wip_queryset = wip_queryset.filter(issued_date__year=year)
            filters_applied["year"] = year

        if month_number:
            try:
                month_number = int(month_number)
                if not (1 <= month_number <= 12):
                    return JsonResponse({"error": "Invalid month. Must be 1–12."}, status=400)
            except ValueError:
                return JsonResponse({"error": "Month must be a number 1–12."}, status=400)

            selected_year = year if year else datetime.now().year
            wip_queryset = wip_queryset.filter(
                issued_date__month=month_number,
                issued_date__year=selected_year
            )
            filters_applied["month"] = f"{calendar.month_name[month_number]} {selected_year}"

        elif date or date:
            if date:
                try:
                    start_date = timezone.datetime.strptime(date, "%Y-%m-%d").date()
                    wip_queryset = wip_queryset.filter(issued_date__gte=start_date)
                    filters_applied["date"] = date
                except ValueError:
                    return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

            if end_date:
                try:
                    end_date = timezone.datetime.strptime(end_date, "%Y-%m-%d").date()
                    wip_queryset = wip_queryset.filter(issued_date__lte=end_date)
                    filters_applied["end_date"] = end_date
                except ValueError:
                    return JsonResponse({"error": "Invalid end_date format. Use YYYY-MM-DD."}, status=400)


        if date:
            try:
                single_date = timezone.datetime.strptime(date, "%Y-%m-%d").date()
                wip_queryset = wip_queryset.filter(issued_date=date)
                filters_applied["date"] = date
            except ValueError:
                return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        if start_year and end_year:
            try:
                start_year = int(start_year)
                end_year = int(end_year)
                wip_queryset = wip_queryset.filter(issued_date__year__range=[start_year, end_year])
                filters_applied["year_range"] = f"{start_year} - {end_year}"
            except ValueError:
                return JsonResponse({"error": "start_year and end_year must be integers."}, status=400)

        if start_month and end_month:
            try:
                start_month = int(start_month)
                end_month = int(end_month)
                selected_year = year if year else datetime.now().year
                if not (1 <= start_month <= 12 and 1 <= end_month <= 12):
                    return JsonResponse({"error": "Months must be between 1 and 12."}, status=400)

                wip_queryset = wip_queryset.filter(
                    issued_date__month__gte=start_month,
                    issued_date__month__lte=end_month,
                    issued_date__year=selected_year
                )
                filters_applied["month_range"] = f"{calendar.month_name[start_month]} - {calendar.month_name[end_month]} {selected_year}"
            except ValueError:
                return JsonResponse({"error": "start_month and end_month must be integers."}, status=400)


        if not wip_queryset.exists():
            return JsonResponse({
                "success": True,
                "filters_applied": filters_applied,
                "total_records": 0,
                "data": []
            }, status=200)

        grouped_data = defaultdict(lambda: {"quantity": 0, "records": []})
        for wip in wip_queryset:
            key = wip.component_name
            grouped_data[key]["quantity"] += wip.quantity
            grouped_data[key]["records"].append(wip)

        response_data = []
        for component, info in grouped_data.items():
            first_record = info["records"][0]
            response_data.append({
                "id": first_record.id,
                "component_name": component,
                "uom": first_record.uom,
                "quantity": info["quantity"],
                "sin_no": first_record.sin_no,
                "issued_date": str(first_record.issued_date),
                "role_id": first_record.role.id if first_record.role else None,
                "created_at": first_record.created_at.strftime("%Y-%m-%d %H:%M:%S")
            })

        return JsonResponse({
            "success": True,
            "filters_applied": filters_applied,
            "total_records": len(response_data),
            "data": response_data
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format."}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"An unexpected error occurred: {str(e)}"}, status=500)



@csrf_exempt
def filter_material_rejection_notes(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        data = json.loads(request.body or "{}")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        month_number = data.get("month")  
        year = data.get("year")  

        date = data.get("date")
        start_month = data.get("start_month")
        end_month = data.get("end_month")
        start_year = data.get("start_year")
        end_year = data.get("end_year")

        mrn_queryset = MaterialRejectionNote.objects.all().order_by('-created_at')
        filters_applied = {
            "month": None, "start_date": None, "end_date": None, "year": None,
            "date": None, "month_range": None, "year_range": None
        }

        if year and not month_number and not (start_date and end_date):
            try:
                year_int = int(year)
                mrn_queryset = mrn_queryset.filter(created_at__year=year_int)
                filters_applied["year"] = str(year_int)
                year_for_filters = year_int
            except ValueError:
                return JsonResponse({"error": "Invalid year format. Must be YYYY."}, status=400)
        else:
            year_for_filters = int(year) if year else None

        if month_number:
            try:
                month_number = int(month_number)
                if not (1 <= month_number <= 12):
                    return JsonResponse({"error": "Invalid month. Must be 1–12."}, status=400)
                year_int = int(year) if year else datetime.now().year
                mrn_queryset = mrn_queryset.filter(
                    created_at__month=month_number,
                    created_at__year=year_int
                )
                filters_applied["month"] = f"{calendar.month_name[month_number]} {year_int}"
                filters_applied["year"] = str(year_int)
                year_for_filters = year_int
            except ValueError:
                return JsonResponse({"error": "Month must be a number 1–12."}, status=400)

        elif start_date and end_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                mrn_queryset = mrn_queryset.filter(created_at__date__range=[start_dt, end_dt])
                filters_applied["start_date"] = start_date
                filters_applied["end_date"] = end_date
                filters_applied["year"] = str(start_dt.year)
                year_for_filters = start_dt.year
            except ValueError:
                return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)


        if date:
            try:
                date = datetime.strptime(date, "%Y-%m-%d").date()
                mrn_queryset = mrn_queryset.filter(created_at__date=date)
                filters_applied["date"] = date
                filters_applied["year"] = str(date.year)
                year_for_filters = date.year
            except ValueError:
                return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        if start_year and end_year:
            try:
                start_year_int = int(start_year)
                end_year_int = int(end_year)
                mrn_queryset = mrn_queryset.filter(created_at__year__range=[start_year_int, end_year_int])
                filters_applied["year_range"] = f"{start_year_int} - {end_year_int}"
            except ValueError:
                return JsonResponse({"error": "start_year and end_year must be integers."}, status=400)

        if start_month and end_month:
            try:
                start_month_int = int(start_month)
                end_month_int = int(end_month)
                year_for_month = year_for_filters if year_for_filters else datetime.now().year
                if not (1 <= start_month_int <= 12 and 1 <= end_month_int <= 12):
                    return JsonResponse({"error": "Months must be between 1 and 12."}, status=400)

                mrn_queryset = mrn_queryset.filter(
                    created_at__month__gte=start_month_int,
                    created_at__month__lte=end_month_int,
                    created_at__year=year_for_month
                )
                filters_applied["month_range"] = f"{calendar.month_name[start_month_int]} - {calendar.month_name[end_month_int]} {year_for_month}"
            except ValueError:
                return JsonResponse({"error": "start_month and end_month must be integers."}, status=400)


        if not mrn_queryset.exists():
            return JsonResponse({
                "success": True,
                "filters_applied": filters_applied,
                "total_records": 0,
                "data": [],
                "stats": {
                    "total_qty_rejected": 0,
                    "with_remarks": 0,
                    "last_entry": None
                }
            }, status=200)

        result = []
        total_qty_rejected = 0
        with_remarks_count = 0

        for mrn in mrn_queryset:
            items = RejectedItem.objects.filter(mrn=mrn)
            item_data = []
            for item in items:
                item_data.append({
                    "id": item.id,
                    "component_name": item.component_name,
                    "uom": item.uom,
                    "qty_rejected": item.qty_rejected,
                    "reason": item.reason,
                })

                total_qty_rejected += item.qty_rejected or 0
                if item.reason and item.reason.strip() != "":
                    with_remarks_count += 1

            month_name = mrn.created_at.strftime("%B %Y") if mrn.created_at else ""
            result.append({
                "id": mrn.id,
                "mrn_no": mrn.mrn_no,
                "issued_by": mrn.issued_by,
                "received_by": mrn.received_by,
                "created_at": mrn.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "role_id": mrn.role.id if mrn.role else None,
                "month": month_name,
                "items": item_data
            })

        last_entry_mrn = next((mrn for mrn in mrn_queryset if RejectedItem.objects.filter(mrn=mrn).exists()), None)
        last_entry_date = last_entry_mrn.created_at.strftime("%Y-%m-%d %H:%M:%S") if last_entry_mrn else None

        return JsonResponse({
            "success": True,
            "filters_applied": filters_applied,
            "total_records": len([mrn for mrn in result if mrn['items']]),
            "data": result,
            "stats": {
                "total_qty_rejected": total_qty_rejected,
                "with_remarks": with_remarks_count,
                "last_entry": last_entry_date
            }
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format."}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"An unexpected error occurred: {str(e)}"}, status=500)




@csrf_exempt
def filter_sin(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body or "{}")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        month_number = data.get("month") 
        year = data.get("year")  

        date = data.get("date")
        start_month = data.get("start_month")
        end_month = data.get("end_month")
        start_year = data.get("start_year")
        end_year = data.get("end_year")

        filters_applied = {
            "month": None, "start_date": None, "end_date": None, "year": None,
            "date": None, "month_range": None, "year_range": None
        }

        sins_queryset = StoresIssueNote.objects.select_related("role").order_by("-id")

        if year and not month_number and not (start_date and end_date):
            try:
                year = int(year)
                sins_queryset = sins_queryset.filter(created_at__year=year)
                filters_applied["year"] = str(year)
            except ValueError:
                return JsonResponse({"success": False, "message": "Invalid year format. Must be YYYY."}, status=400)

        elif month_number:
            try:
                month_number = int(month_number)
                if not (1 <= month_number <= 12):
                    return JsonResponse({"success": False, "message": "Invalid month. Must be 1–12."}, status=400)
            except ValueError:
                return JsonResponse({"success": False, "message": "Month must be a number 1–12."}, status=400)

            year = int(year) if year else datetime.now().year
            sins_queryset = sins_queryset.filter(
                created_at__month=month_number,
                created_at__year=year
            )
            filters_applied["month"] = f"{calendar.month_name[month_number]} {year}"
            filters_applied["year"] = str(year)

        elif start_date and end_date:
            try:
                start_date = datetime.strptime(start_date, "%Y-%m-%d")
                end_date = datetime.strptime(end_date, "%Y-%m-%d")
            except ValueError:
                return JsonResponse({"success": False, "message": "Invalid date format. Use YYYY-MM-DD."}, status=400)

            sins_queryset = sins_queryset.filter(
                created_at__date__range=[start_date, end_date]
            )
            filters_applied["start_date"] = start_date
            filters_applied["end_date"] = end_date
            filters_applied["year"] = str(start_date.year)


        if date:
            try:
                date = datetime.strptime(date, "%Y-%m-%d").date()
                sins_queryset = sins_queryset.filter(created_at__date=date)
                filters_applied["date"] = date
                filters_applied["year"] = str(date.year)
            except ValueError:
                return JsonResponse({"success": False, "message": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        if start_year and end_year:
            try:
                start_year = int(start_year)
                end_year = int(end_year)
                sins_queryset = sins_queryset.filter(created_at__year__range=[start_year, end_year])
                filters_applied["year_range"] = f"{start_year} - {end_year}"
            except ValueError:
                return JsonResponse({"success": False, "message": "start_year and end_year must be integers."}, status=400)

        if start_month and end_month:
            try:
                start_month = int(start_month)
                end_month = int(end_month)
                year_for_month = year if year else datetime.now().year
                if not (1 <= start_month <= 12 and 1 <= end_month <= 12):
                    return JsonResponse({"success": False, "message": "Months must be between 1 and 12."}, status=400)

                sins_queryset = sins_queryset.filter(
                    created_at__month__gte=start_month,
                    created_at__month__lte=end_month,
                    created_at__year=year_for_month
                )
                filters_applied["month_range"] = f"{calendar.month_name[start_month]} - {calendar.month_name[end_month]} {year_for_month}"
            except ValueError:
                return JsonResponse({"success": False, "message": "start_month and end_month must be integers."}, status=400)


        if not sins_queryset.exists():
            return JsonResponse({
                "success": True,
                "filters_applied": filters_applied,
                "total_records": 0,
                "data": []
            }, status=200)

        data_list = [
            {
                "sin_no": sin.sin_no,
                "component_name": sin.component_name,
                "uom": sin.uom,
                "qty_requested": sin.qty_requested,
                "qty_issued": sin.qty_issued,
                "balance": sin.balance,
                "remarks": sin.remarks,
                "issued_by": sin.issued_by,
                "authorized_by": sin.authorized_by,
                "stores_ic": sin.stores_ic,
                "received_by": sin.received_by,
                "created_by": sin.role.first_name if sin.role else "N/A",
                "role_type": sin.role.role_type if sin.role else "N/A",
                "created_on": sin.created_at.strftime("%Y-%m-%d %H:%M"),
                "month": sin.created_at.strftime("%B %Y") if sin.created_at else "",
            }
            for sin in sins_queryset
        ]

        return JsonResponse({
            "success": True,
            "filters_applied": filters_applied,
            "total_records": len(data_list),
            "data": data_list
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"success": False, "message": "Invalid JSON format."}, status=400)
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=500)




@csrf_exempt
def filter_mda(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        data = json.loads(request.body or "{}")
        role_id = data.get("role_id")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        month_number = data.get("month")
        year = data.get("year")

        date = data.get("date")
        start_month = data.get("start_month")
        end_month = data.get("end_month")
        start_year = data.get("start_year")
        end_year = data.get("end_year")

        if not role_id:
            return JsonResponse({"error": "Missing 'role_id'."}, status=400)

        role = Role.objects.get(id=role_id)
        mda_queryset = MaterialDispatchAdvice.objects.all().order_by("-created_at")

        role_type = role.role_type.lower()
        if role_type == "stores incharge":
            mda_queryset = mda_queryset.filter(dispatch_status__in=["Ready to Dispatch", "Ready for Shipment"])
        elif role_type in ["finance", "admin"]:
            pass  
        else:
            return JsonResponse({"error": f"Access denied for role '{role.role_type}'."}, status=403)

        filters_applied = {
            "month": None, "year": None, "start_date": None, "end_date": None,
            "date": None, "start_month": None, "end_month": None,
            "start_year": None, "end_year": None
        }

        if date:
            try:
                date = datetime.strptime(date, "%Y-%m-%d").date()
            except ValueError:
                return JsonResponse({"error": "Invalid 'date' format. Use YYYY-MM-DD."}, status=400)
            mda_queryset = mda_queryset.filter(created_at__date=date)
            filters_applied["date"] = date

        if year:
            try:
                year = int(year)
                mda_queryset = mda_queryset.filter(created_at__year=year)
                filters_applied["year"] = str(year)
            except ValueError:
                return JsonResponse({"error": "Invalid year format. Use YYYY."}, status=400)

        if month_number:
            try:
                month_number = int(month_number)
                if not (1 <= month_number <= 12):
                    return JsonResponse({"error": "Month must be 1–12."}, status=400)
            except ValueError:
                return JsonResponse({"error": "Month must be a number 1–12."}, status=400)

            current_year = year if year else datetime.now().year
            mda_queryset = mda_queryset.filter(
                created_at__month=month_number,
                created_at__year=current_year
            )
            filters_applied["month"] = f"{calendar.month_name[month_number]} {current_year}"

        if start_month and end_month:
            try:
                start_month = int(start_month)
                end_month = int(end_month)
                if not (1 <= start_month <= 12 and 1 <= end_month <= 12):
                    return JsonResponse({"error": "Months must be between 1–12."}, status=400)
            except ValueError:
                return JsonResponse({"error": "Start/End month must be integers 1–12."}, status=400)

            current_year = year if year else datetime.now().year
            mda_queryset = mda_queryset.filter(
                created_at__month__gte=start_month,
                created_at__month__lte=end_month,
                created_at__year=current_year
            )
            filters_applied["start_month"] = calendar.month_name[start_month]
            filters_applied["end_month"] = calendar.month_name[end_month]

        if start_year and end_year:
            try:
                start_year = int(start_year)
                end_year = int(end_year)
            except ValueError:
                return JsonResponse({"error": "Start/End year must be integers (e.g., 2024, 2025)."}, status=400)

            mda_queryset = mda_queryset.filter(
                created_at__year__gte=start_year,
                created_at__year__lte=end_year
            )
            filters_applied["start_year"] = str(start_year)
            filters_applied["end_year"] = str(end_year)

        if start_date and end_date:
            try:
                start_date = datetime.strptime(start_date, "%Y-%m-%d")
                end_date = datetime.strptime(end_date, "%Y-%m-%d")
            except ValueError:
                return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

            mda_queryset = mda_queryset.filter(created_at__date__range=[start_date, end_date])
            filters_applied["start_date"] = start_date
            filters_applied["end_date"] = end_date

        if not (
            date or month_number or year or
            (start_date and end_date) or (start_month and end_month) or
            (start_year and end_year)
        ):
            return JsonResponse({
                "error": "Provide at least one filter: date, year, month, start_date–end_date, start_month–end_month, or start_year–end_year."
            }, status=400)

        if not mda_queryset.exists():
            return JsonResponse({
                "success": True,
                "filters_applied": filters_applied,
                "total_records": 0,
                "data": []
            }, status=200)

        data_list = []
        for mda in mda_queryset:
            po = mda.purchase_order
            balance_amount = round(float(po.total_value) - float(po.payment_received), 2) if po else None

            record = {
                "mda_id": mda.id,
                "mda_no": mda.mda_no,
                "date": mda.dispatch_date.strftime("%Y-%m-%d"),
                "customer_name": po.customer_name if po else None,
                "product_name": po.product_name if po else None,
                "quantity": po.quantity if po else None,
                "total_value": float(po.total_value) if po else None,
                "payment_received": float(po.payment_received) if po else None,
                "balance": balance_amount,
                "remarks": mda.remarks or "",
                "authorized": mda.is_authorized,
                "prepared_by": f"{mda.prepared_by.first_name} {mda.prepared_by.last_name} ({mda.prepared_by.role_type})" if mda.prepared_by else None,
                "finance_approved_by": f"{mda.finance_approved_by.first_name} {mda.finance_approved_by.last_name} ({mda.finance_approved_by.role_type})" if mda.finance_approved_by else None,
                "authorized_by": f"{mda.authorized_by.first_name} {mda.authorized_by.last_name} ({mda.authorized_by.role_type})" if mda.authorized_by else None,
                "store_incharge": f"{mda.store_incharge.first_name} {mda.store_incharge.last_name} ({mda.store_incharge.role_type})" if mda.store_incharge else None,
                "dispatch_status": mda.dispatch_status,
                "created_at": mda.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "authorized_at": mda.authorized_at.strftime("%Y-%m-%d %H:%M:%S") if mda.authorized_at else None,
                "month": mda.created_at.strftime("%B %Y") if mda.created_at else "",
            }
            data_list.append(record)

        return JsonResponse({
            "success": True,
            "filters_applied": filters_applied,
            "total_records": len(data_list),
            "data": data_list
        }, status=200)

    except Role.DoesNotExist:
        return JsonResponse({"error": "Invalid role_id."}, status=400)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format."}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"An unexpected error occurred: {str(e)}"}, status=500)





@csrf_exempt
def filter_mrr_report(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        data = json.loads(request.body or "{}")
        role_id = data.get("role_id")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        month_number = data.get("month")
        year = data.get("year")

        date = data.get("date")
        start_month = data.get("start_month")
        end_month = data.get("end_month")
        start_year = data.get("start_year")
        end_year = data.get("end_year")

        filters_applied = {
            "month": None,
            "year": None,
            "start_date": None,
            "end_date": None,
            "single_date": None,
            "start_month": None,
            "end_month": None,
            "start_year": None,
            "end_year": None,
        }

        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            return JsonResponse({"error": "Invalid role_id"}, status=400)

        inspected_materials_qs = MaterialReceipt.objects.all()

        if date:
            try:
                date = datetime.strptime(date, "%Y-%m-%d").date()
            except ValueError:
                return JsonResponse({"error": "Invalid 'date' format. Use YYYY-MM-DD."}, status=400)
            inspected_materials_qs = inspected_materials_qs.filter(created_at__date=date)
            filters_applied["date"] = date

        if year:
            try:
                year = int(year)
                inspected_materials_qs = inspected_materials_qs.filter(created_at__year=year)
                filters_applied["year"] = str(year)
            except ValueError:
                return JsonResponse({"error": "Invalid year format. Use YYYY (e.g., 2025)."}, status=400)

        if month_number:
            try:
                month_number = int(month_number)
                if not (1 <= month_number <= 12):
                    return JsonResponse({"error": "Invalid month. Must be 1–12."}, status=400)
            except ValueError:
                return JsonResponse({"error": "Month must be a number 1–12."}, status=400)

            current_year = year if year else datetime.now().year
            inspected_materials_qs = inspected_materials_qs.filter(
                created_at__month=month_number, created_at__year=current_year
            )
            filters_applied["month"] = f"{calendar.month_name[month_number]} {current_year}"

        if start_month and end_month:
            try:
                start_month = int(start_month)
                end_month = int(end_month)
                if not (1 <= start_month <= 12 and 1 <= end_month <= 12):
                    return JsonResponse({"error": "Months must be between 1–12."}, status=400)
            except ValueError:
                return JsonResponse({"error": "Start/End month must be integers 1–12."}, status=400)

            current_year = year if year else datetime.now().year
            inspected_materials_qs = inspected_materials_qs.filter(
                created_at__month__gte=start_month,
                created_at__month__lte=end_month,
                created_at__year=current_year,
            )
            filters_applied["start_month"] = calendar.month_name[start_month]
            filters_applied["end_month"] = calendar.month_name[end_month]

        if start_year and end_year:
            try:
                start_year = int(start_year)
                end_year = int(end_year)
            except ValueError:
                return JsonResponse({"error": "Start/End year must be integers (e.g., 2024, 2025)."}, status=400)

            inspected_materials_qs = inspected_materials_qs.filter(
                created_at__year__gte=start_year, created_at__year__lte=end_year
            )
            filters_applied["start_year"] = str(start_year)
            filters_applied["end_year"] = str(end_year)

        if start_date and end_date:
            try:
                start_date = datetime.strptime(start_date, "%Y-%m-%d")
                end_date = datetime.strptime(end_date, "%Y-%m-%d")
            except ValueError:
                return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

            inspected_materials_qs = inspected_materials_qs.filter(
                created_at__date__range=[start_date, end_date]
            )
            filters_applied["start_date"] = start_date.strftime("%Y-%m-%d")
            filters_applied["end_date"] = end_date.strftime("%Y-%m-%d")

        if not (
            date
            or month_number
            or year
            or (start_date and end_date)
            or (start_month and end_month)
            or (start_year and end_year)
        ):
            return JsonResponse({"error": "Provide at least one filter: date, year, month, start_date–end_date, start_month–end_month, or start_year–end_year."}, status=400)

        if not inspected_materials_qs.exists():
            return JsonResponse({
                "success": True,
                "filters_applied": filters_applied,
                "total_records": 0,
                "data": []
            }, status=200)

        mrr_list = []
        total_accepted_qty = 0

        for item in inspected_materials_qs:
            accepted_qty = item.accepted_quantity or 0
            total_price = accepted_qty * float(item.unit_price or 0)
            total_accepted_qty += accepted_qty

            inspected_by = "-"
            inspected_by_id = None
            if item.quality_incharge:
                try:
                    qc_role = Role.objects.get(id=item.quality_incharge)
                    inspected_by = f"{qc_role.role_type.title()} - {qc_role.first_name} {qc_role.last_name}"
                    inspected_by_id = qc_role.id
                except Role.DoesNotExist:
                    inspected_by = "-"
                    inspected_by_id = None

            mrr_list.append({
                "id": item.id,
                "part_number": item.part_number,
                "component_name": item.component_name,
                "quantity": item.quantity,
                "accepted_quantity": accepted_qty,
                "unit_price": float(item.unit_price) if item.unit_price else 0.0,
                "total_price": round(total_price, 2),
                "inspection_status": item.inspection_status.capitalize() if item.inspection_status else "-",
                "inspected_by_id": inspected_by_id,
                "inspected_by": inspected_by,
                "created_at": item.created_at.strftime("%Y-%m-%d %H:%M"),
                "month": item.created_at.strftime("%B %Y") if item.created_at else "",
            })

        return JsonResponse({
            "success": True,
            "filters_applied": filters_applied,
            "total_records": len(mrr_list),
            "total_accepted_quantity": total_accepted_qty,
            "data": mrr_list
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format."}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)



@csrf_exempt
def filter_purchase_orders(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        data = json.loads(request.body or "{}")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        date = data.get("date")  
        start_month = data.get("start_month")  
        end_month = data.get("end_month")      
        start_year = data.get("start_year")    
        end_year = data.get("end_year")       
        month = data.get("month")
        year = data.get("year")

        filters_applied = {
            "date": None,
            "month": None,
            "year": None,
            "start_date": None,
            "end_date": None,
            "start_month": None,
            "end_month": None,
            "start_year": None,
            "end_year": None,
        }

        po_queryset = PurchaseOrder.objects.all().order_by("-created_on")

        if date:
            try:
                single_date_obj = datetime.strptime(date, "%Y-%m-%d").date()
            except ValueError:
                return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

            po_queryset = po_queryset.filter(created_on__date=single_date_obj)
            filters_applied["date"] = date

        elif start_date and end_date:
            try:
                start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
                end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
            except ValueError:
                return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

            po_queryset = po_queryset.filter(created_on__date__range=[start_date_obj, end_date_obj])
            filters_applied["start_date"] = start_date
            filters_applied["end_date"] = end_date

        elif start_month and end_month:
            try:
                start_month = int(start_month)
                end_month = int(end_month)
                if not (1 <= start_month <= 12 and 1 <= end_month <= 12):
                    return JsonResponse({"error": "Months must be between 1 and 12."}, status=400)
            except ValueError:
                return JsonResponse({"error": "Start and End months must be valid numbers."}, status=400)

            current_year = datetime.now().year
            po_queryset = po_queryset.filter(
                created_on__month__gte=start_month,
                created_on__month__lte=end_month,
                created_on__year=current_year
            )
            filters_applied["start_month"] = calendar.month_name[start_month]
            filters_applied["end_month"] = calendar.month_name[end_month]

        elif start_year and end_year:
            try:
                start_year = int(start_year)
                end_year = int(end_year)
            except ValueError:
                return JsonResponse({"error": "Start and End years must be valid numbers."}, status=400)

            po_queryset = po_queryset.filter(
                created_on__year__gte=start_year,
                created_on__year__lte=end_year
            )
            filters_applied["start_year"] = start_year
            filters_applied["end_year"] = end_year

        elif year:
            try:
                year = int(year)
                if year < 2000 or year > datetime.now().year:
                    return JsonResponse({"error": "Invalid year."}, status=400)
            except ValueError:
                return JsonResponse({"error": "Year must be a valid number."}, status=400)

            po_queryset = po_queryset.filter(created_on__year=year)
            filters_applied["year"] = str(year)

        elif month:
            try:
                month = int(month)
                if not (1 <= month <= 12):
                    return JsonResponse({"error": "Invalid month. Must be 1–12."}, status=400)
            except ValueError:
                return JsonResponse({"error": "Month must be a number 1–12."}, status=400)

            current_year = datetime.now().year
            po_queryset = po_queryset.filter(
                created_on__month=month,
                created_on__year=current_year
            )
            filters_applied["month"] = f"{calendar.month_name[month]} {current_year}"

        else:
            return JsonResponse({
                "error": "Provide either date, year, month, start_date-end_date, start_month-end_month, or start_year-end_year."
            }, status=400)

        if not po_queryset.exists():
            return JsonResponse({
                "success": True,
                "filters_applied": filters_applied,
                "total_records": 0,
                "data": []
            }, status=200)

        data_list = []
        for po in po_queryset:
            balance_amount = float(po.total_value - po.payment_received)
            payment_history = [
                {
                    "amount": float(p.amount),
                    "date": p.payment_date.strftime("%Y-%m-%d"),
                    "remarks": p.remarks
                }
                for p in po.payments.all().order_by("-payment_date")
            ]
            data_list.append({
                "po_id": po.id,
                "po_number": po.po_number,
                "customer_name": po.customer_name,
                "customer_email": po.customer_email,
                "customer_address": po.customer_address,
                "product_name": po.product_name,
                "quantity": po.quantity,
                "total_value": float(po.total_value),
                "payment_received": float(po.payment_received),
                "balance": balance_amount,
                "payment_status": po.payment_status,
                "payments": payment_history,
                "date": po.created_on.strftime("%Y-%m-%d"),
                "is_authorized": po.is_authorized,
                "month": po.created_on.strftime("%B %Y") if po.created_on else "",
            })

        return JsonResponse({
            "success": True,
            "filters_applied": filters_applied,
            "total_records": len(data_list),
            "data": data_list
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format."}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)


@csrf_exempt
def filter_inspected_material(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method allowed."}, status=405)

    try:
        import calendar
        from datetime import datetime
        data = json.loads(request.body or "{}")

        role_id = data.get("role_id")
        inspection_status = data.get("inspection_status")
        start_date_str = data.get("start_date")
        end_date_str = data.get("end_date")
        month_number = data.get("month")
        year = data.get("year")
        start_month = data.get("start_month")
        end_month = data.get("end_month")
        start_year = data.get("start_year")
        end_year = data.get("end_year")

        if not role_id:
            return JsonResponse({"error": "Field 'role_id' is required."}, status=400)

        role = Role.objects.filter(id=role_id).only("id", "role_type").first()
        if not role:
            return JsonResponse({"error": "Role not found"}, status=404)

        inspections = MaterialReceipt.objects.filter(role_id=role_id).order_by("-updated_at")

        if inspection_status:
            inspections = inspections.filter(inspection_status__iexact=inspection_status)

        filters_applied = {
            "inspection_status": inspection_status,
            "month": None,
            "year": None,
            "start_date": None,
            "end_date": None,
            "start_month": None,
            "end_month": None,
            "start_year": None,
            "end_year": None
        }

        if start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
                end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
                inspections = inspections.filter(updated_at__date__range=[start_date, end_date])
                filters_applied["start_date"] = start_date_str
                filters_applied["end_date"] = end_date_str
            except ValueError:
                return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        elif month_number and year:
            try:
                month_number = int(month_number)
                year = int(year)
                inspections = inspections.filter(updated_at__month=month_number, updated_at__year=year)
                filters_applied["month"] = calendar.month_name[month_number]
                filters_applied["year"] = str(year)
            except ValueError:
                return JsonResponse({"error": "Month and year must be numeric."}, status=400)

        elif year:
            try:
                year = int(year)
                inspections = inspections.filter(updated_at__year=year)
                filters_applied["year"] = str(year)
            except ValueError:
                return JsonResponse({"error": "Year must be numeric."}, status=400)

        elif start_month and end_month:
            try:
                start_month = int(start_month)
                end_month = int(end_month)
                start_year = int(start_year) if start_year else datetime.now().year
                end_year = int(end_year) if end_year else datetime.now().year

                start_period = datetime(start_year, start_month, 1).date()
                last_day = calendar.monthrange(end_year, end_month)[1]
                end_period = datetime(end_year, end_month, last_day).date()

                inspections = inspections.filter(updated_at__date__range=[start_period, end_period])
                filters_applied["start_month"] = calendar.month_name[start_month]
                filters_applied["end_month"] = calendar.month_name[end_month]
                filters_applied["start_year"] = str(start_year)
                filters_applied["end_year"] = str(end_year)
            except ValueError:
                return JsonResponse({"error": "Invalid start/end month or year format."}, status=400)

        if not inspections.exists():
            return JsonResponse({
                "success": True,
                "message": "No inspection records found for the applied filters.",
                "filters_applied": filters_applied,
                "total_records": 0,
                "data": []
            }, status=200)

        data_list = []
        for rec in inspections:
            data_list.append({
                "id": rec.id,
                "component_name": rec.component_name,
                "quantity": rec.quantity,
                "accepted_quantity": rec.accepted_quantity or 0,
                "rejected_quantity": rec.rejected_quantity or 0,
                "uom": rec.uom or "",
                "unit_price": float(rec.unit_price or 0),
                "inspection_status": rec.inspection_status or "",
                "role_id": rec.role_id,
                "quality_incharge": rec.quality_incharge,
                "updated_at": rec.updated_at.strftime("%Y-%m-%d %H:%M:%S") if rec.updated_at else "",
            })

        return JsonResponse({
            "success": True,
            "message": "Inspection records filtered successfully.",
            "filters_applied": filters_applied,
            "total_records": len(data_list),
            "data": data_list
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON format."}, status=400)
    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {str(e)}"}, status=500)
@csrf_exempt
def add_mda(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed."}, status=405)

    try:
        data = json.loads(request.body)
        po_id = data.get("po_id")
        role_id = data.get("role_id")
        remarks = data.get("remarks", "")

        role = Role.objects.get(id=role_id)

        if role.role_type.lower() not in ["finance", "admin"]:
            return JsonResponse({"error": "Only Finance or Admin role can add MDA"}, status=403)
    
        if not all([po_id, role_id]):
            return JsonResponse({"error": "Missing purchase_order_id or prepared_by"}, status=400)

        po = PurchaseOrder.objects.get(id=po_id)
        role = Role.objects.get(id=role_id)
        
       
        if not po:
            return JsonResponse({"error": "Invalid Purchase Order ID."}, status=400)


        if po.payment_status.lower() != "fully paid":
            return JsonResponse({"error": "PO payment not fully completed"}, status=400)
        
        dispatch_status = "Pending"
     
        mda_no = f"MDA-{timezone.now().strftime('%Y%m%d')}-{MaterialDispatchAdvice.objects.count()+1:03d}"
        mda = MaterialDispatchAdvice.objects.create(
            mda_no=mda_no,
            purchase_order=po,
            remarks=remarks,
            prepared_by=role,
            dispatch_status=dispatch_status
        )

        return JsonResponse({
            "success": True,
            "message": "MDA created successfully.",
            "data": {
                "mda_no": mda.mda_no,
                "po_number": po.po_number,
                "customer_name": po.customer_name,
                "product_name": po.product_name,
                "quantity": po.quantity,
                "total_order_value": float(po.total_value),
                "payment_received": float(po.payment_received),
                "payment_status": po.payment_status,
                "dispatch_status": mda.dispatch_status,
                "created_at": mda.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "prepared_by": mda.prepared_by.first_name,  
                "prepared_by_id": mda.prepared_by.id,      
            }
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
@csrf_exempt
def add_purchase_orders(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)
    try:
        data = json.loads(request.body)
        role_id = data.get("role_id")
        po_number = data.get("po_number")
        customer_name = data.get("customer_name")
        customer_email = data.get("customer_email")
        product_name = data.get("product_name")
        
        customer_address = data.get("customer_address", "")
        payment_terms = data.get("payment_terms", "")
        quantity = int(data.get("quantity"))
        total_value = Decimal(str(data.get("total_value")))
        payment_received = Decimal(str(data.get("payment_received", "0")))


        role = Role.objects.get(id=role_id)

        if role.role_type.lower() not in ["finance", "admin"]:
            return JsonResponse({"error": "Only Finance or Admin role can add PO"}, status=403)

        
        if not all([po_number, customer_name, product_name, quantity, total_value]):
            return JsonResponse({"error": "Missing required fields."}, status=400)

       
        if payment_received == 0:
            payment_status = "Pending"
        elif payment_received < total_value:
            payment_status = "Partially Paid"
        else:
            payment_status = "Fully Paid"

        po = PurchaseOrder.objects.create(
            po_number=po_number,
            customer_name=customer_name,
            customer_email=customer_email,
            product_name=product_name,
            quantity=quantity,
            total_value=total_value,
            payment_received=payment_received,
            payment_status=payment_status,
            created_on=timezone.now(),
            customer_address=customer_address,
            
        )

       
        if payment_received > 0:
            POPayment.objects.create(
                purchase_order=po,
                amount=Decimal(payment_received),
                remarks="Initial Payment"
            )

       

        return JsonResponse({
            "success": True,
            "message": "PO added successfully!",
            "data": {
                "po_id": po.id,
                "po_number": po.po_number,
                "customer_name": po.customer_name,
                "customer_email": po.customer_email,
                "customer_address": po.customer_address,
                "product_name": po.product_name,
                "quantity": po.quantity,
                "total_value": float(po.total_value),
                "payment_received": float(po.payment_received),
                "balance": float(po.total_value - po.payment_received),
                "payment_status": po.payment_status,
                "payments": [
                    {"amount": float(p.amount), "date": p.payment_date.strftime("%Y-%m-%d"), "remarks": p.remarks}
                    for p in po.payments.all()
                ],
                "date": po.created_on.strftime("%Y-%m-%d")
            }
        }, status=201)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

