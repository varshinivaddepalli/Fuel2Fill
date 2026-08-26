export type StatusType = "active" | "inactive" | "suspended" | "deleted"

export interface Client {
  client_id: string
  client_email: string
  client_name: string
  client_phone: string
  client_pan: string | null
  client_aadhaar: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  pincode: string | null
  client_photo: string | null
  status: StatusType
  joining_date: string
  created_at: string
  updated_at: string
}

export interface ClientInsert {
  client_email: string
  client_name: string
  client_phone: string
  client_pan?: string | null
  client_aadhaar?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  client_photo?: string | null
  status?: StatusType
  joining_date?: string
}

export interface Station {
  station_id: string
  client_id: string
  station_name: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  pincode: string
  latitude: number | null
  longitude: number | null
  station_phone: string
  station_sap_code: string
  station_gst_number: string
  status: StatusType
  opening_date: string
  created_at: string
  updated_at: string
}

export interface StationInsert {
  client_id: string
  station_name: string
  address_line1: string
  address_line2?: string | null
  city: string
  state: string
  pincode: string
  latitude?: number | null
  longitude?: number | null
  station_phone: string
  station_sap_code: string
  station_gst_number: string
  status?: StatusType
  opening_date: string
}

export type EmployeeRoleType = "manager" | "pump_boy" | "pump_attendant" | "cashier" | "accountant" | "tank_supervisor" | "security" | "housekeeping"
export type EmploymentType = "full_time" | "part_time"
export type AttendanceStatusType = "present" | "absent" | "half_day" | "leave"

export interface FuelType {
  fueltype_id: string
  station_id: string
  fueltype_name: string
  unit_of_measure: string
  fueltype_price: number
  hsn_code: string | null
  status: StatusType
  created_at: string
  updated_at: string
}

export interface FuelTypeInsert {
  station_id: string
  fueltype_name: string
  unit_of_measure?: string
  fueltype_price: number
  hsn_code?: string | null
  status?: StatusType
}

export interface Tank {
  tank_id: string
  station_id: string
  fueltype_id: string
  tank_name: string
  tank_capacity: number
  capacity_unit: string
  current_stock: number
  status: StatusType
  created_at: string
  updated_at: string
}

export interface TankInsert {
  station_id: string
  fueltype_id: string
  tank_name: string
  tank_capacity: number
  capacity_unit?: string
  current_stock?: number
  status?: StatusType
}

export interface Pump {
  pump_id: string
  station_id: string
  pump_name: string
  nozzle_count: number
  status: StatusType
  created_at: string
  updated_at: string
}

export interface PumpInsert {
  station_id: string
  pump_name: string
  nozzle_count: number
  status?: StatusType
}

export interface Nozzle {
  nozzle_id: string
  station_id: string
  pump_id: string
  tank_id: string
  fueltype_id: string
  nozzle_name: string
  status: StatusType
  created_at: string
  updated_at: string
}

export interface NozzleInsert {
  station_id: string
  pump_id: string
  tank_id: string
  fueltype_id: string
  nozzle_name: string
  status?: StatusType
}

export interface StationProduct {
  station_product_id: string
  station_id: string
  product_name: string
  hsn_code: string | null
  purchase_price: number
  selling_price: number
  discount_amount: number
  current_stock: number
  minimum_stock: number
  available: boolean
  created_at: string
  updated_at: string
}

export interface StationProductInsert {
  station_id: string
  product_name: string
  hsn_code?: string | null
  purchase_price: number
  selling_price: number
  discount_amount?: number
  current_stock?: number
  minimum_stock?: number
  available?: boolean
}

// Employee Types
export interface Employee {
  employee_id: string
  station_id: string
  employee_name: string
  employee_role: EmployeeRoleType
  employee_phone: string
  employee_address: string | null
  aadhaar_number: string | null
  employment_type: EmploymentType
  joining_date: string
  salary: number
  employee_photo: string | null
  status: StatusType
  created_at: string
  updated_at: string
}

export interface EmployeeInsert {
  station_id: string
  employee_name: string
  employee_role: EmployeeRoleType
  employee_phone: string
  employee_address?: string | null
  aadhaar_number?: string | null
  employment_type?: EmploymentType
  joining_date?: string
  salary: number
  employee_photo?: string | null
  status?: StatusType
}

// Employee Shift Types
export interface EmployeeShift {
  shift_id: string
  employee_id: string
  station_id: string
  pump_id: string | null
  nozzle_id: string | null
  assigned_by: string | null
  start_time: string
  end_time: string | null
  total_hours: number | null
  status: StatusType
  created_at: string
  updated_at: string
}

export interface EmployeeShiftInsert {
  employee_id: string
  station_id: string
  pump_id?: string | null
  nozzle_id?: string | null
  assigned_by?: string | null
  start_time: string
  end_time?: string | null
  total_hours?: number | null
  status?: StatusType
}

// Employee Attendance Types
export interface EmployeeAttendance {
  attendance_id: string
  employee_id: string
  station_id: string
  shift_id: string | null
  attendance_date: string
  hours_worked: number | null
  attendance_status: AttendanceStatusType
  marked_by: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeAttendanceInsert {
  employee_id: string
  station_id: string
  shift_id?: string | null
  attendance_date: string
  hours_worked?: number | null
  attendance_status?: AttendanceStatusType
  marked_by?: string | null
}

// Daily Fuel Price Types
export interface DailyFuelPrice {
  price_update_id: string
  station_id: string
  fueltype_id: string
  new_price: number
  effective_date: string
  employee_id: string
  status: StatusType
  created_at: string
  updated_at: string
}

export interface DailyFuelPriceInsert {
  station_id: string
  fueltype_id: string
  new_price: number
  effective_date: string
  employee_id: string
  status?: StatusType
}

// Price History Logs Types (audit table - no insert type needed, populated by trigger)
export interface PriceHistoryLog {
  history_id: string
  station_id: string
  fueltype_id: string
  old_price: number | null
  new_price: number
  effective_date: string
  price_update_id: string
  created_at: string
}

// Daily Sale Records Types
export interface DailySaleRecord {
  sale_record_id: string
  station_id: string
  pump_id: string
  nozzle_id: string
  employee_id: string
  sale_date: string
  fuel_price: number
  opening_reading: number
  close_reading: number
  testing_qty: number
  total_liters: number
  total_amount: number
  cash_sales: number
  upi_sales: number
  card_sales: number
  credit_sales: number
  status: StatusType
  created_at: string
  updated_at: string
}

export interface DailySaleRecordInsert {
  station_id: string
  pump_id: string
  nozzle_id: string
  employee_id: string
  sale_date: string
  fuel_price: number
  opening_reading: number
  close_reading: number
  testing_qty?: number
  total_liters?: number
  total_amount?: number
  cash_sales?: number
  upi_sales?: number
  card_sales?: number
  credit_sales?: number
  status?: StatusType
}

// Credit Management Types
export type CreditLimitType = "amount" | "quantity"
export type DiscountType = "amount" | "percentage"
export type PaymentMode = "cash" | "upi" | "card" | "cheque" | "bank_transfer"
export type PaymentStatusType = "unpaid" | "partially_paid" | "paid"

// Credit Customer
export interface CreditCustomer {
  credit_customer_id: string
  station_id: string
  customer_name: string
  gst_number: string | null
  phone: string
  alt_phone: string | null
  email: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  pincode: string | null
  credit_limit_type: CreditLimitType
  credit_limit_value: number
  discount_type: DiscountType | null
  discount_value: number | null
  current_balance: number
  registered_date: string
  status: StatusType
  created_at: string
  updated_at: string
}

export interface CreditCustomerInsert {
  station_id: string
  customer_name: string
  gst_number?: string | null
  phone: string
  alt_phone?: string | null
  email?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  credit_limit_type: CreditLimitType
  credit_limit_value: number
  discount_type?: DiscountType | null
  discount_value?: number | null
  registered_date?: string
  status?: StatusType
}

// Credit Customer Vehicle
export interface CreditCustomerVehicle {
  vehicle_id: string
  credit_customer_id: string
  vehicle_number: string
  vehicle_type: string | null
  status: StatusType
  created_at: string
  updated_at: string
}

export interface CreditCustomerVehicleInsert {
  credit_customer_id: string
  vehicle_number: string
  vehicle_type?: string | null
  status?: StatusType
}

// Credit Transaction
export interface CreditTransaction {
  transaction_id: string
  credit_customer_id: string
  station_id: string
  sale_record_id: string | null
  vehicle_id: string | null
  fueltype_id: string
  employee_id: string
  transaction_date: string
  fuel_quantity: number
  unit_price: number
  discount_applied: number
  gross_amount: number
  net_amount: number
  running_balance: number
  payment_status: PaymentStatusType
  amount_paid: number
  notes: string | null
  status: StatusType
  created_at: string
  updated_at: string
}

export interface CreditTransactionInsert {
  credit_customer_id: string
  station_id: string
  sale_record_id?: string | null
  vehicle_id?: string | null
  fueltype_id: string
  employee_id: string
  transaction_date: string
  fuel_quantity: number
  unit_price: number
  notes?: string | null
  status?: StatusType
  // gross_amount, net_amount, discount_applied, running_balance are computed by trigger
}

// Credit Payment
export interface CreditPayment {
  payment_id: string
  credit_customer_id: string
  station_id: string
  transaction_id: string | null
  employee_id: string
  payment_date: string
  payment_amount: number
  payment_mode: PaymentMode
  reference_number: string | null
  balance_before: number
  balance_after: number
  notes: string | null
  status: StatusType
  created_at: string
  updated_at: string
}

export interface CreditPaymentInsert {
  credit_customer_id: string
  station_id: string
  transaction_id?: string | null
  employee_id: string
  payment_date: string
  payment_amount: number
  payment_mode: PaymentMode
  reference_number?: string | null
  notes?: string | null
  status?: StatusType
  // balance_before, balance_after are computed by trigger
}

// Product Sale Items Types
export type ProductPaymentMethod = "cash" | "upi" | "card" | "bank_transfer" | "credit"

export interface ProductSaleItem {
  product_sale_id: string
  station_id: string
  employee_id: string
  product_id: string
  sale_date: string
  quantity: number
  unit_price: number
  total_amount: number
  payment_method: ProductPaymentMethod
  status: StatusType
  created_at: string
  updated_at: string
}

export interface ProductSaleItemInsert {
  station_id: string
  employee_id: string
  product_id: string
  sale_date: string
  quantity: number
  unit_price: number
  total_amount?: number
  payment_method: ProductPaymentMethod
  status?: StatusType
}

// Expense Management Types
export type ExpenseCategory =
  | "maintenance"
  | "utilities"
  | "rent"
  | "insurance"
  | "marketing"
  | "office_supplies"
  | "transportation"
  | "professional_fees"
  | "taxes"
  | "other"

export type ExpensePaymentMethod = "cash" | "upi" | "card" | "credit" | "bank_transfer"

export interface StationExpense {
  expense_id: string
  station_id: string
  approved_by: string
  expense_date: string
  category: ExpenseCategory
  amount: number
  payment_method: ExpensePaymentMethod
  vendor_name: string | null
  description: string | null
  status: StatusType
  created_at: string
  updated_at: string
}

export interface StationExpenseInsert {
  station_id: string
  approved_by: string
  expense_date: string
  category: ExpenseCategory
  amount: number
  payment_method: ExpensePaymentMethod
  vendor_name?: string | null
  description?: string | null
  status?: StatusType
}

// Purchase Management Types
export type PurchaseType = "fuel" | "product"
export type PurchasePaymentMethod = "bank_transfer" | "cash" | "upi" | "credit"

export interface Purchase {
  purchase_id: string
  station_id: string
  purchase_date: string
  purchase_type: PurchaseType
  payment_method: PurchasePaymentMethod
  gst_amount: number
  total_amount: number
  vendor_name: string | null
  notes: string | null
  status: StatusType
  created_at: string
  updated_at: string
}

export interface PurchaseInsert {
  station_id: string
  purchase_date: string
  purchase_type: PurchaseType
  payment_method: PurchasePaymentMethod
  gst_amount?: number
  total_amount?: number
  vendor_name?: string | null
  notes?: string | null
  status?: StatusType
}

export interface PurchaseFuelItem {
  fuel_item_id: string
  purchase_id: string
  fuel_type_id: string
  purchase_price_per_liter: number
  total_quantity: number
  total_amount: number
  created_at: string
  updated_at: string
}

export interface PurchaseFuelItemInsert {
  purchase_id: string
  fuel_type_id: string
  purchase_price_per_liter: number
  total_quantity: number
}

export interface PurchaseFuelTankAllocation {
  allocation_id: string
  fuel_item_id: string
  tank_id: string
  quantity: number
  created_at: string
}

export interface PurchaseFuelTankAllocationInsert {
  fuel_item_id: string
  tank_id: string
  quantity: number
}

export interface PurchaseProductItem {
  product_item_id: string
  purchase_id: string
  product_id: string
  purchase_price: number
  quantity: number
  total_amount: number
  created_at: string
  updated_at: string
}

export interface PurchaseProductItemInsert {
  purchase_id: string
  product_id: string
  purchase_price: number
  quantity: number
}

// Bank Account Types
export type BankAccountType = "personal" | "company"

export interface ClientBankAccount {
  bank_account_id: string
  client_id: string
  account_type: BankAccountType
  account_name: string
  account_holder_name: string
  account_number_last4: string
  bank_name: string
  branch: string | null
  current_balance: number
  company_name: string | null
  status: StatusType
  created_at: string
  updated_at: string
}

export interface ClientBankAccountInsert {
  client_id: string
  account_type: BankAccountType
  account_name: string
  account_holder_name: string
  account_number_last4: string
  bank_name: string
  branch?: string | null
  current_balance?: number
  company_name?: string | null
  status?: StatusType
}

// Settlement Types
export type SettlementMethod = "cash" | "upi" | "card" | "bank"

export interface Settlement {
  settlement_id: string
  client_id: string
  station_id: string
  settlement_date: string
  from_method: SettlementMethod
  to_method: SettlementMethod
  from_bank_account_id: string | null
  to_bank_account_id: string | null
  amount: number
  reference_number: string | null
  notes: string | null
  status: StatusType
  created_at: string
  updated_at: string
}

export interface SettlementInsert {
  client_id: string
  station_id: string
  settlement_date: string
  from_method: SettlementMethod
  to_method: SettlementMethod
  from_bank_account_id?: string | null
  to_bank_account_id?: string | null
  amount: number
  reference_number?: string | null
  notes?: string | null
}

// Click Astra Types (OCR Document Processing)
export type ClickAstraStatus = "pending" | "processing" | "completed" | "failed" | "verified"

export interface ClickAstra {
  id: string
  client_id: string
  name: string                           // User-given name for the document
  image_name: string                     // Original filename
  image_url: string                      // URL to Supabase storage
  date: string                           // Document date
  extraction_columns: string[] | null    // Columns user wants to extract
  llm_instructions: string | null        // Custom instructions for LLM
  ocr_extracted_data: Record<string, unknown> | null  // Raw OCR output
  ai_response: Record<string, unknown> | null         // Structured LLM response
  processing_status: ClickAstraStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface ClickAstraInsert {
  client_id: string
  name: string
  image_name: string
  image_url: string
  date?: string
  extraction_columns?: string[] | null
  llm_instructions?: string | null
  processing_status?: ClickAstraStatus
}

// Click Astra Template Types
export interface ClickAstraTemplate {
  id: string
  client_id: string
  name: string
  extraction_columns: string[]
  llm_instructions: string | null
  created_at: string
  updated_at: string
}

export interface ClickAstraTemplateInsert {
  name: string
  extraction_columns: string[]
  llm_instructions?: string | null
}
