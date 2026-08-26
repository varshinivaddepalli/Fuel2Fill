"""Navigation mapping utility for Ask Astra generative UI."""

# Routes must match frontend sidebar exactly (see app-sidebar.tsx)
NAVIGATION_ROUTES = {
    # Dashboard
    "dashboard": {"label": "Dashboard", "path": "/dashboard"},
    # Registration - View
    "view_stations": {"label": "View Stations", "path": "/registration/view-stations"},
    # Registration - Station Master (consolidated)
    "station_master": {"label": "Station Master", "path": "/registration/station-master"},
    "add_station": {"label": "Add Station", "path": "/registration/station-master"},
    "add_fuel_type": {"label": "Add Fuel Type", "path": "/registration/station-master"},
    "add_tank": {"label": "Add Tank", "path": "/registration/station-master"},
    "add_pump": {"label": "Add Pump", "path": "/registration/station-master"},
    "add_nozzle": {"label": "Add Nozzle", "path": "/registration/station-master"},
    "add_product": {"label": "Add Product", "path": "/registration/add-product"},
    "add_employee": {"label": "Add Employee", "path": "/employee/add-employee"},
    # Employee
    "view_employees": {"label": "View Employee", "path": "/employee/view-employee"},
    "shifts": {"label": "Employee Shifts", "path": "/employee/shifts"},
    "attendance": {"label": "Attendance", "path": "/employee/attendance"},
    # Operations
    "daily_entry": {"label": "Daily Entry", "path": "/operations/daily-entry"},
    "fuel_prices": {"label": "Daily Fuel Price", "path": "/operations/daily-fuel-price"},
    "sale_records": {"label": "Daily Sale Record", "path": "/operations/daily-sale-record"},
    "product_sales": {"label": "Product Sales", "path": "/operations/product-sales"},
    "purchases": {"label": "Purchases", "path": "/purchases"},
    "expenses": {"label": "Expenses", "path": "/operations/expenses"},
    "stock_view": {"label": "Stock View", "path": "/stock"},
    "settlement": {"label": "Settlement", "path": "/operations/settlement"},
    # Credit
    "credit_customers": {"label": "Credit Customers", "path": "/credit/customers"},
    "credit_transactions": {"label": "Credit Transactions", "path": "/credit/transactions"},
    "credit_payments": {"label": "Credit Payments", "path": "/credit/payments"},
    # AI Features
    "ask_astra": {"label": "Ask Astra", "path": "/ask-astra"},
    "click_astra": {"label": "Click Astra", "path": "/click-astra"},
    # Profile
    "profile": {"label": "Profile", "path": "/profile"},
}

KEYWORD_MAPPINGS = {
    # Dashboard
    "dashboard": ["overview", "summary", "statistics", "stats", "total", "dashboard"],
    # Registration - View
    "view_stations": ["view station", "my station", "list station", "all station", "station detail"],
    # Registration - Station Master
    "station_master": ["station master", "station setup", "configure station", "station configuration", "station infrastructure"],
    # Registration - Add (include article variants: "add a pump", "add an employee")
    "add_station": ["add station", "add a station", "new station", "create station", "register station"],
    "add_fuel_type": ["add fuel type", "add a fuel type", "new fuel type", "register fuel", "create fuel type"],
    "add_tank": ["add tank", "add a tank", "new tank", "create tank", "register tank"],
    "add_pump": ["add pump", "add a pump", "new pump", "create pump", "register pump", "install pump", "install a pump"],
    "add_nozzle": ["add nozzle", "add a nozzle", "new nozzle", "create nozzle", "register nozzle"],
    "add_product": ["add product", "add a product", "new product", "create product", "register product"],
    "add_employee": ["add employee", "add an employee", "add a employee", "new employee", "hire employee", "hire an employee", "create employee", "register employee", "onboard employee"],
    # Employee
    "view_employees": ["employee", "staff", "worker", "personnel", "team member", "view employee", "list employee"],
    "shifts": ["shift", "schedule", "duty", "roster", "working hours"],
    "attendance": ["attendance", "present", "absent", "leave", "check-in", "check-out"],
    # Operations
    "daily_entry": ["daily entry", "record daily sales", "daily sale entry", "enter daily", "daily record"],
    "fuel_prices": ["fuel price", "diesel price", "petrol price", "cng price", "rate", "cost per liter", "price history"],
    "sale_records": ["sale", "sales", "daily sale", "nozzle reading", "meter reading", "revenue"],
    "product_sales": ["product sale", "product sales", "non-fuel sale", "lubricant sale", "accessory sale", "sold product"],
    "purchases": ["purchase", "fuel purchase", "product purchase", "supplier", "vendor", "incoming stock", "stock purchase", "buy fuel", "procurement"],
    "expenses": ["expense", "station expense", "maintenance cost", "utility bill", "rent payment", "record expense", "track expense", "office supplies", "transportation cost"],
    "stock_view": ["stock", "inventory", "current stock", "tank stock", "product stock", "stock level", "check stock", "view stock"],
    "settlement": ["settlement", "settle", "cash deposit", "cash to bank", "fund transfer", "cash settlement"],
    # Credit
    "credit_customers": ["credit customer", "credit account", "outstanding", "dues", "receivable"],
    "credit_transactions": ["credit transaction", "credit purchase", "bought on credit"],
    "credit_payments": ["credit payment", "payment received", "collection", "paid dues"],
    # AI Features
    "ask_astra": ["ask astra", "ai analytics", "natural language", "chat with data"],
    "click_astra": ["click astra", "ocr", "scan document", "scan a document", "upload invoice", "upload a document", "receipt", "document processing"],
    # Profile
    "profile": ["profile", "my account", "account settings", "my details"],
}


def get_navigation_from_keywords(query: str) -> list[dict[str, str]]:
    """
    Rule-based navigation suggestions based on query keywords.
    Returns up to 2 matching navigation actions.

    Priority: longer keyword phrases match first (more specific),
    so "add employee" matches add_employee before "employee" matches view_employees.
    """
    query_lower = query.lower()
    matches = []
    seen_paths = set()

    # Sort keyword entries by longest keyword first for specificity
    scored_matches: list[tuple[int, str]] = []
    for route_key, keywords in KEYWORD_MAPPINGS.items():
        for keyword in keywords:
            if keyword in query_lower:
                scored_matches.append((len(keyword), route_key))
                break

    # Sort by keyword length descending (most specific first)
    scored_matches.sort(key=lambda x: x[0], reverse=True)

    for _, route_key in scored_matches:
        route = NAVIGATION_ROUTES[route_key]
        if route["path"] not in seen_paths:
            matches.append(route)
            seen_paths.add(route["path"])
            if len(matches) >= 2:
                break

    return matches
