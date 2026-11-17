"""
URL configuration for pavaman_proj project.

The urlpatterns list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from pavaman_backend.views import (add_admin, admin_edit_order_details,admin_login,admin_logout,
    add_category, delete_product_specifications, delete_role, edit_role,view_categories,edit_category,delete_category,
    add_subcategory,view_subcategories,edit_subcategory,delete_subcategory,
    add_product,add_product_specifications,edit_product_specifications,view_products,
    view_product_details,edit_product,delete_product,retrieve_feedback,
    search_categories,search_subcategories,search_products,download_discount_products_excel,
    apply_discount_by_subcategory_only,admin_verify_otp,
    report_inventory_summary,top_buyers_report,
    monthly_product_orders,download_feedback_excel,download_average_rating_excel,
    product_discount_inventory_view,download_inventory_products_excel,upload_products_excel,add_role,view_roles,
    role_login,role_verify_otp,role_logout
    )
from pavaman_backend.customer_views import (customer_register,customer_login, get_product_info_by_id, get_tracking_data, remove_from_wishlist, shipway_webhook, sync_tracking_from_shipway, track_shipway_order,view_categories_and_discounted_products,
    view_sub_categories_and_discounted_products,
    view_products_details,add_product_to_cart,view_product_cart,delete_product_cart,delete_selected_products_cart,add_customer_address,
    view_customer_address,edit_customer_address,delete_customer_address,order_multiple_products,multiple_order_summary
    ,cancel_multiple_orders,filter_product_price_each_category,sort_products_inside_subcategory,
    get_customer_details_by_admin,verify_email,resend_verification_email,google_login,update_cart_quantity,
    google_submit_mobile,otp_generate,verify_otp,set_new_password,filter_and_sort_products_each_subcategory,
    create_razorpay_order,customer_search_categories,customer_search_subcategories,customer_search_products,
    get_payment_details_by_order, download_material_file,customer_get_payment_details_by_order,customer_logout,
    report_monthly_revenue_by_year,report_sales_summary, edit_customer_profile,get_customer_profile,
    top_five_selling_products,get_all_category_subcategory,not_selling_products,filter_my_order,
    generate_invoice_for_customer,admin_order_status,customer_cart_view_search,edit_profile_mobile_otp_handler,
    edit_profile_email_otp_handler,filter_and_sort_products,submit_feedback_rating,edit_feedback_rating,view_rating,
    add_to_wishlist,view_wishlist,latest_products_current_year,view_products_by_category_and_subcategory,share_product_preview,razorpay_webhook,
    cancel_my_order,
)

from pavaman_backend.store_views import (add_material_receipt, add_mda, add_po_payment, add_purchase_orders, authorize_mda, consolidated_report_charts, filter_consolidated_report, filter_inspected_material, filter_material_receipt, filter_material_rejection_notes, filter_material_transfer_notes, filter_mda, filter_mrr_report, filter_overall_stock, filter_product_stock, filter_purchase_orders, filter_sin, filter_wip, inspect_material_excel, mark_ready_for_shipment, update_sin, upload_mda_excel, upload_mrn_excel, upload_mtn_excel, view_consolidated_report_details, 
                                         view_daily_consolidated_report,view_material_receipts,inspect_material, view_mda, view_mrr_report,
                                         view_overall_stock,view_product_stock,
                                         add_material_transfer_note,view_material_transfer_notes, view_purchase_orders,view_wip,add_material_rejection_note,
                                         view_material_rejection_notes,create_sin,view_sin,upload_material_receipt_excel,upload_sin_excel)


from django.conf.urls.static import static
from django.conf import settings
urlpatterns = [
    path('admin/', admin.site.urls),
    path('add-admin',add_admin,name='add_admin'),
    path('admin-login',admin_login,name='admin_login'),
    path('admin-verify-otp',admin_verify_otp,name='admin_verify_otp'),
    path('admin-logout',admin_logout,name='admin_logout'),
    path('add-category', add_category, name='add_category'),
    path('view-categories', view_categories, name='view_categories'),
    path('edit-category',edit_category,name='edit_category'),
    path('delete-category',delete_category,name='delete_category'),

    path('add-subcategory', add_subcategory, name='add_subcategory'),
    path('view-subcategories', view_subcategories, name='view_subcategories'),
    path('edit-subcategory',edit_subcategory,name='edit_subcategory'),
    path('delete-subcategory',delete_subcategory,name='delete_subcategory'),

    path('add-product',add_product,name='add_product'),
    path('add-product-specifications',add_product_specifications,name='add_product_specifications'),
    path('edit-product-specifications',edit_product_specifications,name='edit_product_specifications'),
    path('delete-product-specifications',delete_product_specifications,name='delete_product_specifications'),
    path('view-products',view_products,name='view_products'),
    path('view-product-details',view_product_details,name='view_product_details'),
    path('edit-product',edit_product,name='edit_product'),
    path('delete-product',delete_product,name='delete_product'),
    path('search-categories',search_categories,name='search_categories'),
    path('search-subcategories',search_subcategories,name='search_subcategories'),
    path('search-products',search_products,name='search_products'),
    path('retrieve-feedback',retrieve_feedback,name= 'retrieve_feedback'),
    path('download-feedback-excel',download_feedback_excel,name= 'download_feedback_excel'),

    path('customer-register', customer_register, name='customer_register'), 
    path('customer-login',customer_login,name='customer_login'), 
    path("google-login", google_login, name="google_login"),
    path('verify-email/<str:verification_link>/',verify_email, name='verify_email'),
    path('resend-verification-email',resend_verification_email, name='resend_verification_email'),
    path('google-submit-mobile',google_submit_mobile,name='google_submit_mobile'),
    path('otp-generate',otp_generate,name='otp_generate'),
    path('verify-otp',verify_otp,name='verify_otp'),
    path("set-new-password", set_new_password, name="set_new_password"),
    path('',view_categories_and_discounted_products,name='view_categories_and_discounted_products'),
    path('categories/view-sub-categories/', view_sub_categories_and_discounted_products, name='view_sub_categories_and_discounted_products'),
    path('products/<str:product_name>/', view_products_details, name='view_products_details'),
    path('add-cart-product',add_product_to_cart,name='add_product_to_cart'),
    path('view-cart-products',view_product_cart,name='view_product_cart'),
    path('update-cart-quantity',update_cart_quantity,name='update_cart_quantity'),
    path('delete-cart-product',delete_product_cart,name='delete_product_cart'),
    path('delete-selected-products-cart',delete_selected_products_cart,name='delete_selected_products_cart'),
    path('add-customer-address',add_customer_address,name='add_customer_address'),
    path('view-customer-address',view_customer_address,name='view_customer_address'),
    path('edit-customer-address',edit_customer_address,name='edit_customer_address'),
    path('delete-customer-address',delete_customer_address,name='delete_customer_address'),
    path('products/order-multiple-products',order_multiple_products,name='order_multiple_products'),
    path('products/order-multiple-products-summary',multiple_order_summary,name='multiple_order_summary'),
    path('products/cancel-multiple-orders',cancel_multiple_orders,name='cancel_multiple_orders'),
    path('filter-product-price-each-category',filter_product_price_each_category,name= 'filter_product_price_each_category'),
    path('sort-products-inside-subcategory',sort_products_inside_subcategory,name= 'sort_products_inside_subcategory'),
    path("get-customer-by-admin/", get_customer_details_by_admin, name="get_customer_details_by_admin"),
    path('create-razorpay-order',create_razorpay_order,name= 'create_razorpay_order'),
    
    path("customer-search-categories",customer_search_categories, name="customer_search_categories"),
    path("customer-search-subcategories",customer_search_subcategories, name="customer_search_subcategories"),
    path("customer-search-products",customer_search_products, name="customer_search_products"),
    path("admin-edit-order-details",admin_edit_order_details, name="admin_edit_order_details"),
    path("get-payment-details-by-order",get_payment_details_by_order, name="get_payment_details_by_order"),
    path("customer-my-order",customer_get_payment_details_by_order, name="customer_get_payment_details_by_order"),
    path('download-material/<int:product_id>/', download_material_file, name='download_material'),
    path('edit-customer-profile', edit_customer_profile, name='edit_customer_profile'),
    path('get-customer-profile', get_customer_profile, name='get_customer_profile'),
    path("report-sales-summary",report_sales_summary, name="report_sales_summary"),
    path("report-monthly-revenue-by-year",report_monthly_revenue_by_year, name="report_monthly_revenue_by_year"),    
    path("top-five-selling-products",top_five_selling_products, name="top_five_selling_products"),
    path("get-all-category-subcategory",get_all_category_subcategory, name="get_all_category_subcategory"),
    path("not-selling-products",not_selling_products, name="not_selling_products"),
    path("generate-invoice-for-customer",generate_invoice_for_customer, name="generate_invoice_for_customer"),
    path("order-status-summary",admin_order_status, name="admin_order_status"),
    path('customer-cart-view-search', customer_cart_view_search, name='customer_cart_view_search'),
    path('shipway-webhook/', shipway_webhook, name='shipway_webhook'),
    path('sync_tracking_from_shipway/', sync_tracking_from_shipway, name='sync_tracking_from_shipway'),
    # path('sync_tracking_from_shipway_api/', sync_tracking_from_shipway_api, name='sync_tracking_from_shipway_api'),
    path('get-tracking-data', get_tracking_data, name='get_tracking_data'),

    path('edit-profile-mobile', edit_profile_mobile_otp_handler, name='edit_profile_mobile_otp_handler'),
    path('edit-profile-email',edit_profile_email_otp_handler,name= 'edit_profile_email_otp_handler'),
    path('filter-and-sort-products',filter_and_sort_products,name= 'filter_and_sort_products'),    
    path('download-discount-products-excel',download_discount_products_excel,name= 'download_discount_products_excel'),
    path('apply-discount-subcategory',apply_discount_by_subcategory_only,name= 'apply_discount_by_subcategory_only'),
    path('submit-feedback-rating',submit_feedback_rating,name= 'submit_feedback_rating'),
    # path('order-or-delivery-status',order_or_delivery_status,name= 'order_or_delivery_status'),
    path('filter-my-order',filter_my_order,name= 'filter_my_order'),
    path('edit-feedback-rating',edit_feedback_rating,name= 'edit_feedback_rating'),
    path('view-rating',view_rating,name= 'view_rating'),
    path('report-inventory-summary',report_inventory_summary,name= 'report_inventory_summary'),
    path('top-buyers-report',top_buyers_report,name= 'top_buyers_report'),
    path('monthly-product-orders',monthly_product_orders,name= 'monthly_product_orders'),
    path('download-feedback-excel',download_feedback_excel,name= 'download_feedback_excel'),
    path('product-discount-inventory-view',product_discount_inventory_view,name= 'product_discount_inventory_view'),
    path('download-inventory-products-excel',download_inventory_products_excel,name= 'download_inventory_products_excel'),
    path('download-average-rating-excel',download_average_rating_excel,name= 'download_average_rating_excel'),
    path('upload-products-excel',upload_products_excel,name= 'upload_products_excel'),
    path('filter_and_sort_products_each_subcategory',filter_and_sort_products_each_subcategory,name= 'filter_and_sort_products_each_subcategory'),
    path('add-to-wishlist',add_to_wishlist,name= 'add_to_wishlist'),
    path('view-wishlist',view_wishlist,name= 'view_wishlist'),
    path('latest-products', latest_products_current_year, name='latest_products_current_year'),
    # path('view-products-by-category-and-subcategory',view_products_by_category_and_subcategory,name='view_products_by_category_and_subcategory'),
    path('categories/<str:category_name>/<str:sub_category_name>/',view_products_by_category_and_subcategory,name='view_products_by_category_and_subcategory'),
    path('share-preview/<int:product_id>/',share_product_preview,name='share_product_preview'),
    path('razorpay-webhook/', razorpay_webhook, name='razorpay_webhook'),
    path('remove-wishlist', remove_from_wishlist,name='remove_from_wishlist'),
    path('cancel-order',cancel_my_order,name='cancel_my_order'),
    path('get-product-info-by-id/<int:product_id>',get_product_info_by_id,name='get_product_info_by_id'),
    path('track_shipway_order',track_shipway_order,name='track_shipway_order'),
    
    path('add-role',add_role, name='role'),
    path('edit-role',edit_role,name='edit_role'),
    path('view-roles',view_roles,name='view_roles'),
    path('role-login',role_login,name='role_login'),
    path('role-verify-otp',role_verify_otp,name='role_verify_otp'),
    path('role-logout',role_logout,name='role_logout'),
    path('delete-role',delete_role,name='delete_role'),


    path('add-material-receipt',add_material_receipt,name='add_material_receipt'),
    path('view-material-receipts',view_material_receipts,name='view_material_receipts'),
    path('inspect-material',inspect_material,name='inspect_material'),
    path('view-overall-stock',view_overall_stock,name='view_overall_stock'),
    path('view-product-stock',view_product_stock,name='view_product_stock'),
    path('add-material-transfer-note',add_material_transfer_note,name='add_material_transfer_note'),
    path('view-material-transfer-notes',view_material_transfer_notes,name='view_material_transfer_notes'),
    # path('add-wip',add_wip,name='add_wip'),
    path('view-wip',view_wip,name='view_wip'),
    path('add-material-rejection-note',add_material_rejection_note,name='add_material_rejection_note'),
    path('view-material-rejection-notes',view_material_rejection_notes,name='view_material_rejection_notes'),
    path('create-sin',create_sin, name='create_sin'),
    path('update-sin',update_sin, name="update_sin"),
    path('view-sin',view_sin, name="view_sin"),

    path('add-mda', add_mda,name ="add_mda"),
    path('view-mda', view_mda,name='view_mda'),
    path('authorize-mda', authorize_mda,name='authorize_mda'),
    path("view-po",view_purchase_orders,name="view_purchase_orders"),
    path("add-po",add_purchase_orders,name="add_purchase_orders"),
    path("add-po-payment/<int:po_id>",add_po_payment,name="add_po_payment"),

    path('upload-material-receipt-excel',upload_material_receipt_excel,name='upload_material_receipt_excel'),
    path('inspect-material-excel',inspect_material_excel,name='inspect_material_excel'),
    path('upload-sin-excel',upload_sin_excel,name='upload_sin_excel'),
    path('upload-mtn-excel',upload_mtn_excel,name="upload_mtn_excel"),
    path('upload-mrn-excel',upload_mrn_excel,name='upload_mrn_excel'),
    path('view-daily-consolidated-report',view_daily_consolidated_report, name='view_daily_consolidated_report'),
    path('view-mrr-report',view_mrr_report,name='view_mrr_report'),
    path('mark-for-shipment',mark_ready_for_shipment,name='mark_ready_for_shipment'),
    path("upload-mda-excel", upload_mda_excel, name='upload_mda_excel'),

    path('filter-material-receipt',filter_material_receipt,name='filter_material_receipt'),
    path('filter-overall-stock',filter_overall_stock,name='filter_overall_stock'),
    path('filter-product-stock',filter_product_stock,name='filter_product_stock'),
    path('filter-material-transfer-notes',filter_material_transfer_notes,name='filter_material_transfer_notes'),
    path('filter-wip',filter_wip,name='filter_wip'),
    path('filter-material-rejection-notes',filter_material_rejection_notes,name='filter_material_rejection_notes'),
    path('filter-sin',filter_sin,name='filter_sin'),
    path('filter-mda',filter_mda,name='filter_mda'),
    path('filter-mrr-report',filter_mrr_report,name='filter_mrr_report'),
    path('filter-purchase-orders',filter_purchase_orders,name='filter_purchase_orders'),
    path('filter-inspected-material',filter_inspected_material,name='filter_inspected_material'),

    path('view-daily-consolidated-report',view_daily_consolidated_report, name='view_daily_consolidated_report'),
    path('view-consolidated-report-details',view_consolidated_report_details, name='view_consolidated_report_details'),

    path('filter-consolidated-report', filter_consolidated_report, name='filter_consolidated_report'),
    path('consolidated-report-charts',consolidated_report_charts,name='consolidated_report_charts')

]+ static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

