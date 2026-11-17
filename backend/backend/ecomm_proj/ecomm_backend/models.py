from django.db import models 
from django.utils import timezone
from django.contrib.auth.hashers import make_password
import uuid
from datetime import datetime, timedelta
from django.contrib.postgres.fields import ArrayField
from django.db.models import JSONField 
from django.contrib.auth.hashers import make_password, check_password
from .otp_expire import validate_otp
class PavamanAdminDetails(models.Model):
    username = models.CharField(max_length=120, unique=True)
    email = models.EmailField(unique=True)
    mobile_no = models.CharField(max_length=15, default='')
    otp =  models.CharField(max_length=255,null=True, blank=True)
    password = models.CharField(max_length=255)
    changed_on = models.DateTimeField(null=True, blank=True)
    status = models.IntegerField(default=1)
    def __str__(self):
        return self.username
    def is_otp_valid(self, plain_otp):
        return validate_otp(self, plain_otp)
class CategoryDetails(models.Model):
    category_name = models.CharField(max_length=120)
    created_at = models.DateTimeField()
    category_image = models.CharField(max_length=120)
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE)
    category_status = models.IntegerField(default=1)
    def __str__(self):
        return self.category_name
class SubCategoryDetails(models.Model):
    sub_category_name = models.CharField(max_length=120)
    created_at = models.DateTimeField()
    sub_category_image = models.CharField(max_length=120, blank=True, null=True)
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE)
    category = models.ForeignKey(CategoryDetails, on_delete=models.CASCADE)
    sub_category_status = models.IntegerField(default=1)
    def __str__(self):
        return self.sub_category_name
class ProductsDetails(models.Model):
    product_name = models.CharField(max_length=200)
    sku_number = models.CharField(max_length=100, unique=True)
    price = models.FloatField()
    quantity = models.IntegerField(default=0) 
    discount = models.FloatField(default=0.0)
    material_file = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField()
    number_of_specifications = models.IntegerField(default=0)
    specifications = models.JSONField(blank=True, null=True)
    product_images = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField()
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE)
    category = models.ForeignKey(CategoryDetails, on_delete=models.CASCADE)
    sub_category = models.ForeignKey(SubCategoryDetails, on_delete=models.CASCADE)
    status = models.IntegerField(default=1)
    availability = models.CharField(max_length=50, default="in_stock")
    product_status = models.IntegerField(default=1)
    cart_status = models.BooleanField(default=False)
    gst = models.FloatField(default=0.0)
    hsn_code = models.CharField(max_length=30, default='')
    weight_charge= models.FloatField(default=0.0)
    standard_shipping= models.FloatField(default=0.0)
    air_shipping= models.FloatField(default=0.0)
    def __str__(self):
        return self.product_name
class CustomerRegisterDetails(models.Model):
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    mobile_no = models.CharField(max_length=15, default='')
    password = models.CharField(max_length=255,null=True, blank=True)
    status = models.IntegerField(default=1)
    register_status = models.IntegerField(default=0)
    created_on = models.DateTimeField(auto_now_add=True)
    verification_link = models.CharField(max_length=255, null=True, blank=True)
    admin = models.ForeignKey(PavamanAdminDetails ,on_delete=models.CASCADE)
    account_status = models.IntegerField(default=0)
    otp = models.CharField(max_length=255,null=True, blank=True)
    otp_send_type = models.CharField(max_length=255, null=True, blank=True)
    reset_link = models.CharField(max_length=255, null=True, blank=True)
    changed_on = models.DateTimeField(null=True, blank=True)
    register_type = models.CharField(max_length=20,default='mannual_acc')
    def save(self, *args, **kwargs):
        if self.password and not self.password.startswith("pbkdf2_sha256$"):
            self.password = make_password(self.password)
        super().save(*args, **kwargs)
    def is_otp_valid(self, plain_otp):
        return validate_otp(self, plain_otp)
    def clear_expired_otp(self):
        if not self.is_otp_valid():
            self.otp = None
            self.reset_link = None
            self.save()
    def _str_(self):
        return self.email
class CartProducts(models.Model):
    customer = models.ForeignKey(CustomerRegisterDetails, on_delete=models.CASCADE)
    product = models.ForeignKey(ProductsDetails, on_delete=models.CASCADE)
    category = models.ForeignKey(CategoryDetails, on_delete=models.CASCADE)
    sub_category = models.ForeignKey(SubCategoryDetails, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField()
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE)
    insurance_quantity = models.IntegerField(default=0)
    with_insurance= models.BooleanField(default=False)

    def __str__(self):
        return f"{self.customer} - {self.product} ({self.quantity})"

class CustomerAddress(models.Model):
    ADDRESS_TYPE_CHOICES = [
        ('home', 'Home'),
        ('work', 'Work'),
    ]

    customer = models.ForeignKey(CustomerRegisterDetails, on_delete=models.CASCADE, related_name="addresses")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    mobile_number = models.CharField(max_length=15)
    alternate_mobile = models.CharField(max_length=15, blank=True, null=True)
    address_type = models.CharField(max_length=10, choices=ADDRESS_TYPE_CHOICES, default='home')
    pincode = models.CharField(max_length=10)
    street = models.CharField(max_length=255)
    landmark = models.CharField(max_length=255,default="")
    village = models.CharField(max_length=255)
    mandal = models.CharField(max_length=255, blank=True, null=True)
    postoffice = models.CharField(max_length=255, blank=True, null=True)
    district = models.CharField(max_length=255, blank=True, null=True,default="")
    state = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    latitude = models.CharField(max_length=100,default="")
    longitude = models.CharField(max_length=100,default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    select_address = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.address_type} ({self.pincode})"
class OrderProducts(models.Model):
    ORDER_STATUS_CHOICES = [
    ("Pending", "Pending"),
    ("Paid", "Paid"),
    ("Failed", "Failed"),
    ("Cancelled", "Cancelled"),
    ("Refunded", "Refunded"),
    ]
    customer = models.ForeignKey(CustomerRegisterDetails, on_delete=models.CASCADE)
    product = models.ForeignKey(ProductsDetails, on_delete=models.CASCADE)
    category = models.CharField(max_length=255)
    sub_category = models.CharField(max_length=255)
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    final_price = models.DecimalField(max_digits=10, decimal_places=2)
    order_status = models.CharField(max_length=50,choices=ORDER_STATUS_CHOICES, default='Pending')
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE)
    shipping_status= models.CharField(default="")
    delivery_status = models.CharField(default="")
    delivery_charge= models.FloatField(default=0.0)
    weight_charge= models.FloatField(default=0.0)
    self_pickup_address= models.CharField(max_length=20, default="")
    pickup_date = models.DateField(null=True, blank=True)
    pickup_slot = models.CharField(max_length=20, null=True, blank=True)
    insurance_quantity = models.IntegerField(default=0)
    insurance_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order {self.id} - {self.product.name}"
class PaymentDetails(models.Model):
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE)
    customer = models.ForeignKey(CustomerRegisterDetails, on_delete=models.CASCADE)
    customer_address = models.ForeignKey(CustomerAddress, on_delete=models.CASCADE)
    category_ids = JSONField(default=list)
    sub_category_ids = JSONField(default=list)
    product_ids = JSONField(default=list)
    order_product_ids = JSONField(default=list)
    razorpay_order_id = models.CharField(max_length=255, unique=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    shipping_type= models.CharField(max_length=50, default="standard")
    shipping_charge= models.FloatField(default=0.0)
    PAYMENT_TYPE_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
    ]
    PAYMENT_MODE_TYPE_CHOICES = [
        ('cash', 'Cash'),
        ('upi', 'UPI'),
        ('card', 'Card'),
    ]
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, default='online')
    payment_mode = models.CharField(max_length=40, choices=PAYMENT_MODE_TYPE_CHOICES, default='cash')
    transaction_id = models.CharField(max_length=255, blank=True, null=True)
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    product_order_id = models.CharField(default="")
    invoice_number = models.CharField(default="")
    invoice_date = models.DateTimeField(auto_now_add=True,null=True)
    payment_status = models.CharField(max_length=20, choices=[
        ("created", "Created"),
        ("pending", "Pending"),
        ("captured", "Captured"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ], default="created")
    order_status= models.CharField(default="") #cancel
    cancel_date = models.DateTimeField(null=True, blank=True)
    shipping_type= models.CharField(max_length=50, default="standard")
    shipping_charge= models.FloatField(default=0.0)
    def str(self):
        return f"Order {self.razorpay_order_id} - {self.payment_type} ({self.payment_mode})"

class FeedbackRating(models.Model):
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE)
    customer = models.ForeignKey(CustomerRegisterDetails, on_delete=models.CASCADE)
    payment = models.ForeignKey(PaymentDetails, on_delete=models.CASCADE)
    order_product = models.ForeignKey(OrderProducts, on_delete=models.CASCADE)
    order_id = models.CharField(max_length=255) 
    product = models.ForeignKey(ProductsDetails, on_delete=models.CASCADE) 
    category = models.ForeignKey(CategoryDetails, on_delete=models.CASCADE)
    sub_category = models.ForeignKey(SubCategoryDetails, on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField() 
    feedback = models.TextField(blank=True, null=True)
    product_images = models.JSONField(default=list,blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def str(self):
        return f"Rating {self.rating} by Customer {self.customer.id} for Product {self.product.name}"

class Wishlist(models.Model):
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE)
    customer = models.ForeignKey(CustomerRegisterDetails, on_delete=models.CASCADE)
    product = models.ForeignKey(ProductsDetails, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ('customer', 'product')

    def __str__(self):
        return f"{self.customer.email} - {self.product.product_name}"
class Shipment(models.Model):
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE)
    customer = models.ForeignKey(CustomerRegisterDetails, on_delete=models.CASCADE)
    payment= models.ForeignKey(PaymentDetails, on_delete=models.CASCADE)
    courier_id = models.CharField(max_length=100, null=True, blank=True)
    courier_name = models.CharField(max_length=100, null=True, blank=True)
    tracking_id = models.CharField(max_length=100, null=True, blank=True)
    awb_number = models.CharField(max_length=100, null=True, blank=True)
    weight = models.FloatField(default=0.1)  # optional, default weight
    created_at = models.DateTimeField(auto_now_add=True)
    manifest_status = models.CharField(max_length=50, default=" ")

    def __str__(self):
        return f"{self.order.id} - {self.courier_name} ({self.awb_number})"
class OrderShipment(models.Model):
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE)
    customer = models.ForeignKey(CustomerRegisterDetails, on_delete=models.CASCADE)
    payment= models.ForeignKey(PaymentDetails, on_delete=models.CASCADE)
    
    product_order_id = models.CharField(default="")

    awb_no = models.CharField(max_length=50, null=True, blank=True)

    current_status = models.CharField(max_length=100)
    current_status_time = models.DateTimeField(null=True, blank=True)

    tracking_history = models.JSONField(default=list)  
    carrier = models.CharField(max_length=100, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"Order {self.order_id} - AWB: {self.awb_no}"    
class Role(models.Model):
    admin = models.ForeignKey(PavamanAdminDetails, null=True, blank=True, on_delete=models.SET_NULL)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(max_length=50, unique=True,db_index=True)
    mobile_no = models.CharField(max_length=15, unique=True,db_index=True)
    role_type = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    delete_status = models.BooleanField(default=False)
    otp =  models.CharField(max_length=255,null=True, blank=True)
    otp_send_type = models.CharField(max_length=50, null=True, blank=True)
    changed_on = models.DateTimeField(null=True, blank=True)
    status = models.IntegerField(default=1)
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.role_type})"
    def is_otp_valid(self, plain_otp):
        return validate_otp(self, plain_otp)
class MaterialReceipt(models.Model):
    admin = models.ForeignKey(PavamanAdminDetails, null=True, blank=True, on_delete=models.CASCADE)
    role= models.ForeignKey(Role, null=True, blank=True, on_delete=models.SET_NULL) #admin id
  
    part_number = models.CharField(max_length=100)
    hsn_code = models.CharField(max_length=50)
    component_name = models.CharField(max_length=200)
    
    supplier = models.CharField(max_length=200)
    invoice_no = models.CharField(max_length=100)
    invoice_date = models.DateField()
    
    po_no = models.CharField(max_length=100)
    po_date = models.DateField()    
    uom = models.CharField(max_length=50)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    taxes = models.DecimalField(max_digits=12, decimal_places=2)
    inspection_status = models.CharField(max_length=100, blank=True, null=True)
    accepted_quantity = models.IntegerField(default=0)
    rejected_quantity = models.IntegerField(default=0)
    stores_incharge = models.IntegerField(blank=True, null=True)
    quality_incharge = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return f"{self.part_number} - {self.component_name}"
class OverallStock(models.Model):
    admin = models.ForeignKey(PavamanAdminDetails, null=True, blank=True, on_delete=models.CASCADE)
    role= models.ForeignKey(Role, null=True, blank=True, on_delete=models.SET_NULL)
    component_name = models.CharField(max_length=255) 
    uom = models.CharField(max_length=50)             
    total_quantity = models.PositiveIntegerField(default=0)  
    average_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    total_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('component_name', 'uom')

    def __str__(self):
        return f"{self.component_name} - {self.total_quantity} {self.uom}"
     
class ProductStock(models.Model):
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE, null=True, blank=True)
    product = models.ForeignKey(ProductsDetails, on_delete=models.CASCADE, null=True, blank=True)

    description = models.CharField(max_length=255)
    specifications = models.TextField(blank=True, null=True)
    uom = models.CharField(max_length=50)
    qty_required_per_drone = models.PositiveIntegerField(default=0)
    part_number = models.CharField(max_length=100)
    country_of_origin = models.CharField(max_length=100, blank=True, null=True)
    qty_in_stock = models.PositiveIntegerField(default=0)
    basic_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst = models.DecimalField(max_digits=5, decimal_places=2, default=0)  # %
    total_price_inc_gst = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    remarks = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.description} ({self.part_number})"
    
class StoresIssueNote(models.Model):
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE, null=True, blank=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)  

    sin_no = models.CharField(max_length=50, unique=True)
    date = models.DateField(default=timezone.now)

    component_name = models.CharField(max_length=255)
    uom = models.CharField(max_length=50)

    qty_requested = models.PositiveIntegerField()
    qty_issued = models.PositiveIntegerField(default=0)
    balance = models.PositiveIntegerField(default=0)
    unit_price_at_issue = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # New field
    issued_date = models.DateField(default=timezone.now)  # Tracks actual issue date
    remarks = models.TextField(blank=True, null=True)

    issued_by = models.CharField(max_length=100)
    authorized_by = models.CharField(max_length=100)
    stores_ic = models.CharField(max_length=100)
    received_by = models.CharField(max_length=100)

    created_at = models.DateTimeField(auto_now_add=True)

def save(self, *args, **kwargs):
    """Update SIN with correct issuing rules"""
    if not self.pk: 
        self.qty_issued = 0
        self.balance = self.qty_requested
        self.issued_by = "Pending"  
    else:
        original = StoresIssueNote.objects.get(pk=self.pk)
        if self.qty_issued < original.qty_issued:
            raise ValueError("Cannot reduce issued quantity once issued.")
        if self.qty_issued > original.qty_requested:
            raise ValueError("Issued quantity cannot exceed requested quantity.")
        self.balance = self.qty_requested - self.qty_issued

    super().save(*args, **kwargs)

    def __str__(self):
        return f"SIN {self.sin_no} - {self.component_name}"

class WIP(models.Model):
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE, null=True, blank=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)

    component_name = models.CharField(max_length=255)
    uom = models.CharField(max_length=50)
    quantity = models.PositiveIntegerField()

    sin_no = models.CharField(max_length=50)
    issued_date = models.DateField(default=timezone.now)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.component_name} - {self.quantity} in WIP"

class MaterialTransferNote(models.Model):
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE, null=True, blank=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    mtn_no = models.CharField(max_length=50, unique=True)   # MTN Number
    created_at = models.DateTimeField(auto_now_add=True)

    issued_by = models.CharField(max_length=100, blank=True, null=True)
    authorized_by = models.CharField(max_length=100, blank=True, null=True)
    received_by = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"MTN {self.mtn_no}"
class MaterialItem(models.Model):
    mtn = models.ForeignKey(MaterialTransferNote, on_delete=models.CASCADE, related_name="items")
    item_name = models.CharField(max_length=200)
    uom = models.CharField(max_length=50)  # Unit of Measure
    qty_transferred = models.DecimalField(max_digits=10, decimal_places=2)
    sin_no = models.CharField(max_length=50, unique=True, null=True, blank=True)

    remarks = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.item_name} ({self.qty_transferred} {self.uom})"
    
class MaterialRejectionNote(models.Model):
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE, null=True, blank=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)

    mrn_no = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    product_name = models.CharField(max_length=255)
    quantity = models.IntegerField(default=0)

    issued_by = models.CharField(max_length=100, blank=True, null=True)
    received_by = models.CharField(max_length=100, blank=True, null=True)
    authorized_by = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"MRN {self.mrn_no}"
    
class RejectedItem(models.Model):
    mrn = models.ForeignKey(MaterialRejectionNote, on_delete=models.CASCADE, related_name="items")
    component_name = models.CharField(max_length=200)
    uom = models.CharField(max_length=50)
    qty_rejected = models.PositiveIntegerField()
    reason = models.TextField(blank=True, null=True)
    product_name = models.CharField(max_length=255, null=True, blank=True)
    quantity = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"{self.component_name} - {self.qty_rejected} {self.uom}"

class RejectedMaterialStock(models.Model):
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE, null=True, blank=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)

    component_name = models.CharField(max_length=200)
    uom = models.CharField(max_length=50)
    qty_in_stock = models.PositiveIntegerField(default=0)

    value = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # Always ZERO

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.component_name} - {self.qty_in_stock} (Rejected)"
class PurchaseOrder(models.Model):
    po_number = models.CharField(max_length=100, unique=True)
    customer_name = models.CharField(max_length=255)
    customer_email = models.EmailField(blank=True, null=True)
    customer_address = models.TextField(blank=True, null=True)
    product_name = models.CharField(max_length=255)
    quantity = models.IntegerField(default=0)
    total_value = models.DecimalField(max_digits=12, decimal_places=2)
    payment_received = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_terms = models.CharField(max_length=255, blank=True, null=True)
    po_file = models.FileField(upload_to="purchase_orders/", blank=True, null=True)
    payment_status = models.CharField(max_length=50, default="Pending")  # Pending / Partially Paid / Fully Paid
    status = models.CharField(max_length=50, default="")  # Open / Closed / Cancelled
    created_on = models.DateTimeField(auto_now_add=True)
    is_authorized = models.BooleanField(default=False)
    authorized_by = models.ForeignKey(Role, null=True, blank=True, on_delete=models.SET_NULL, related_name="authorized_pos")
    authorized_at = models.DateTimeField(null=True, blank=True)
    def __str__(self):
        return f"{self.po_number} - {self.customer_name}"

class MaterialDispatchAdvice(models.Model):
    mda_no = models.CharField(max_length=100, unique=True)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, null=True, blank=True)
    dispatch_date = models.DateField(default=timezone.now)
    remarks = models.TextField(blank=True, null=True)

    prepared_by = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, related_name="mda_prepared_by")
    finance_approved_by = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, related_name="mda_finance_approved_by")
    authorized_by = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, related_name="mda_authorized_by")
    store_incharge = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, related_name="mda_store_incharge")

    dispatch_status = models.CharField(
        max_length=50,
        choices=[("Pending", "Pending"), ("Approved", "Approved"), ("Dispatched", "Dispatched")],
        default="Pending"
    )
    shipment_status = models.CharField(
        max_length=50,
        choices=[("Pending", "Pending"), ("Shipped", "Shipped")],
        default="Pending"
    )
    shipment_date = models.DateField(null=True, blank=True)
    is_authorized = models.BooleanField(default=False)
    authorized_at = models.DateTimeField(null=True, blank=True)
    invoice_generated = models.BooleanField(default=False)
    invoice_path = models.FileField(upload_to="invoices/", blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"MDA-{self.mda_no}"
class POPayment(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_date = models.DateTimeField(default=timezone.now)
    remarks = models.TextField(blank=True, null=True)
   
    def __str__(self):
        return f"{self.purchase_order.po_number} - ₹{self.amount} on {self.payment_date.strftime('%Y-%m-%d')}"
     
class DailyInventoryReport(models.Model):
    report_date = models.DateField(unique=True)
    total_stock_received_qty = models.PositiveIntegerField(default=0)
    total_stock_received_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    total_stock_issued_qty = models.PositiveIntegerField(default=0)
    total_sales_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    profit_or_loss = models.DecimalField(max_digits=12, decimal_places=2, default=0)    
    generated_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Daily Report - {self.report_date}"
class SalesOrder(models.Model):
    ORDER_SOURCE_CHOICES = (
        ('INTERNAL', 'Internal'),
        ('EXTERNAL', 'External'),
    )
    admin = models.ForeignKey(PavamanAdminDetails, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    order_source = models.CharField(max_length=10,choices=ORDER_SOURCE_CHOICES)
    customer_name = models.CharField(max_length=150)
    drone_model = models.CharField(max_length=100)
    quantity = models.IntegerField(default=0)
    delivery_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.IntegerField(default=1)

    def __str__(self):
        return f"{self.customer_name} - {self.drone_model.drone_name}"