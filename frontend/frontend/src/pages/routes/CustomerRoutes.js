import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

import CustomerSignup from "../Customer/CustomerSignup/CustomerSignup";
import CustomerLogin from "../Customer/CustomerLogin/CustomerLogin";
import CustomerMobileVerification from "../Customer/CustomerMobileVerification/CustomerMobileVerification";
import ViewCategoriesAndDiscountedProducts from "../Customer/CustomerViewCategory/CustomerViewCategory";
import ViewSubCategoriesAndDiscountedProducts from "../Customer/CustomerViewSubCategory/CustomerViewSubCategory";
import CustomerViewProducts from "../Customer/CustomerViewProducts/CustomerViewProducts";
import CustomerViewProductDetails from "../Customer/CustomerViewProductDetails/CustomerViewProductDetails";
import CustomerLayout from "./CustomerLayout";
import CustomerViewCart from "../Customer/CustomerViewCart/CustomerViewCart";
import CustomerCheckoutPage from "../Customer/CustomerOrderCheckout/CustomerOrderCheckout";
import EditAddress from "../Customer/CustomerEditAddress/CustomerEditAddress";
import FilteredProducts from "../Customer/CustomerFilterProducts/CustomerFilterProducts";
import RazorpayPayment from "../Customer/CustomerPayment/CustomerPayment";
import ManageCustomerAddress from "../Customer/CustomerManageAddress/CustomerManageAddress";
import CustomerViewOrder from "../Customer/CustomerViewOrder/CustomerViewOrder";
import VerifyEmail from "../Customer/CustomerVerifyEmail/CustomerVerifyEmail";
import CustomerProfile from "../Customer/CustomerProfile/CustomerProfile";
import CustomerEditProfile from "../Customer/CustomerEditProfile/CustomerEditProfile";
import CustomerMyOrder from "../Customer/CustomerMyOrder/CustomerMyOrder";
import CustomerMyOrderDetails from "../Customer/CustomerMyOrderDetails/CustomerMyOrderDetails";
import AllCategories from "../Customer/CustomerAllCategories/AllCategories";
import AllProducts from "../Customer/CustomerAllCategories/Products";
import Contact from "../Customer/Contact/Contact";
import B2B from '../Customer/B2B/B2B';
import CustomerProfileOptions from "../../pages/Customer/CustomerHeader/CustomerProfileOptions";
import Policies from '../Customer/CustomerFooter/TempPolicies';
import ViewWishlist from "../Customer/CustomerWishlist/CustomerViewWishlist";
import LatestProducts from "../Customer/LatestProducts/LatestProducts";
import { GOOGLE_CLIENT_ID } from "../../config";
import RoleLogin from "../RolesLogin/RoleLogin";

import RolesDashboard from "../RolesDashboard/RolesDashboard";
import DmrrPage from "../../inventory/Dmrr/DmrrPage";
import StockPage from "../../inventory/OverallStock/StockPage";
import BomPage from "../../inventory/BOM/BomPage";
import SINPage from "../../inventory/SIN/SinPage";
import MTNPage from "../../inventory/MTN/MTNPage";
import MRNPage from "../../inventory/MRN/MRNPage";
import WIPPage from "../../inventory/WIP/WIPPage";
import MDAPage from "../../inventory/MDA/MDAPage";
import PurchaseOrderPage from "../../inventory/POPage/POPage";
import MRRPage from "../../inventory/MRR/MRRPage"

import ConsolidatedReportTable from "../../inventory/ConsolidatedData/ConsolidatedReportTable";
import ConsolidatedReportCharts from "../../inventory/ConsolidatedData/ConsolidatedReportCharts";


const CLIENT_ID = GOOGLE_CLIENT_ID;

const CustomerRoutes = () => {
  const [isCustomerAuthenticated, setCustomerAuthenticated] = useState(false);
  const [isRoleAuthenticated, setIsRoleAuthenticated] = useState(false);

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <Routes>
        <Route path="/customer-login" element={<CustomerLogin setCustomerAuthenticated={setCustomerAuthenticated} />} />
        <Route path="/customer-register" element={<CustomerSignup />} />
        <Route path="/customer-mobile-verification" element={<CustomerMobileVerification />} />
        <Route path="/verify-email/:verification_link" element={<VerifyEmail />} />
       <Route path="/role-login"  element={<RoleLogin setIsRoleAuthenticated={setIsRoleAuthenticated} />} />


        <Route path="/roles-dashboard" element={<RolesDashboard />} />
         <Route path="/dmrr-page" element={<DmrrPage/>}/>
         <Route path="/stock-page" element={<StockPage/>}/>
          <Route path="/bom-page" element={<BomPage/>}/>
           <Route path="/sin-page" element={<SINPage/>}/>
           <Route path="/wip-page" element={<WIPPage/>}/>

           <Route path='/mtn-page' element={<MTNPage />}/>
           <Route path='/mrn-page' element={<MRNPage />}/>
           <Route path='/mda-page' element={<MDAPage />}/>
          <Route path="/po-page" element={<PurchaseOrderPage/>}/>
           <Route path="/day-wise-consolidated-report" element={<ConsolidatedReportTable />}/>
           <Route  path="/consolidated-report-charts"   element={<ConsolidatedReportCharts/>} />
           <Route path="/mrr-page" element={<MRRPage />} />

           




        <Route element={<CustomerLayout />}>
          <Route path="/" element={<ViewCategoriesAndDiscountedProducts />} />
          <Route path="categories/view-sub-categories/" element={<ViewSubCategoriesAndDiscountedProducts />} />
          <Route path="/categories/:categoryName/:subCategoryName" element={<CustomerViewProducts />} />
          <Route path="/product-details/:categoryName/:subCategoryName/:productId" element={<CustomerViewProductDetails />} />
          <Route path="/view-cart-products" element={<CustomerViewCart />} />
          <Route path="/checkout-page" element={<CustomerCheckoutPage />} />
          <Route path="/edit-address" element={<EditAddress />} />
          <Route path="/filtered-products" element={<FilteredProducts />} />
          <Route path="/payment" element={<RazorpayPayment />} />
          <Route path="/address" element={<ManageCustomerAddress />} />
          <Route path="/profile" element={<CustomerProfile />} />
          <Route path="/edit-profile" element={<CustomerEditProfile />} />
          <Route path="/my-orders" element={<CustomerMyOrder />} />
          <Route path="/my-orders-details" element={<CustomerMyOrderDetails />} />
          <Route path="/all-categories" element={<AllCategories />} />
          <Route path="/all-products" element={<AllProducts />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/b2b" element={<B2B />} />
          <Route path="/profile-options" element={<CustomerProfileOptions />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/wishlist" element={<ViewWishlist />} />
          <Route path="/latest-products" element={<LatestProducts/>}/>

          



        </Route>
      </Routes>
    </GoogleOAuthProvider>
  );
};

export default CustomerRoutes;