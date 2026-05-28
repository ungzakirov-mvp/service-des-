from app.database import SessionLocal
from app.models_tariffs import TariffPlan, TariffFeature, ServiceCatalog

db = SessionLocal()
db.query(TariffFeature).delete()
db.query(TariffPlan).delete()
db.query(ServiceCatalog).delete()
db.commit()

plans = [
    TariffPlan(
        name_ru="\u0411\u0430\u0437\u043e\u0432\u044b\u0439", name_en="Basic", name_uz="Asosiy",
        slug="basic", price_monthly=19900000,
        max_workstations=3,
        description_ru="\u041c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u043b\u0430\u043d \u0434\u043b\u044f \u043c\u0438\u043a\u0440\u043e-\u0431\u0438\u0437\u043d\u0435\u0441\u0430 \u2014 \u0431\u0430\u0437\u043e\u0432\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0440\u0430\u0431\u043e\u0447\u0438\u0445 \u0441\u0442\u0430\u043d\u0446\u0438\u0439",
        description_en="Minimal plan for micro-business \u2014 basic workstation support",
        description_uz="Mikro-biznes uchun minimal reja \u2014 asosiy ish stansiyasi qo\u2018llab-quvvatlash",
        is_popular=False, sort_order=1
    ),
    TariffPlan(
        name_ru="\u0421\u0442\u0430\u0440\u0442\u043e\u0432\u044b\u0439", name_en="Starter", name_uz="Boshlang\u2018ich",
        slug="starter", price_monthly=49000000,
        max_workstations=10,
        description_ru="\u041f\u043e\u043b\u043d\u044b\u0439 \u043f\u043b\u0430\u043d \u0434\u043b\u044f \u043c\u0430\u043b\u043e\u0433\u043e \u0431\u0438\u0437\u043d\u0435\u0441\u0430 \u2014 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f \u0438 \u0441\u0435\u0442\u0438",
        description_en="Full plan for small business \u2014 hardware and network support",
        description_uz="Kichik biznes uchun to\u2018liq reja \u2014 uskunalar va tarmoq qo\u2018llab-quvvatlash",
        is_popular=False, sort_order=2
    ),
    TariffPlan(
        name_ru="\u0411\u0438\u0437\u043d\u0435\u0441", name_en="Business", name_uz="Biznes",
        slug="business", price_monthly=149000000,
        max_workstations=25,
        description_ru="\u041f\u043e\u043b\u043d\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u044b \u2014 \u0441\u0435\u0440\u0432\u0435\u0440\u044b, \u0441\u0435\u0442\u044c, \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c",
        description_en="Full infrastructure support \u2014 servers, network, security",
        description_uz="To\u2018liq infratuzilma qo\u2018llab-quvvatlash \u2014 serverlar, tarmoq, xavfsizlik",
        is_popular=True, sort_order=3
    ),
    TariffPlan(
        name_ru="\u041f\u0440\u0435\u043c\u0438\u0443\u043c", name_en="Premium", name_uz="Premium",
        slug="premium", price_monthly=249000000,
        max_workstations=50,
        description_ru="\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043d\u043d\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0441 \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433\u043e\u043c, \u0431\u0435\u043a\u0430\u043f\u043e\u043c \u0438 \u043f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442\u043d\u044b\u043c \u0440\u0435\u0430\u0433\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435\u043c",
        description_en="Extended support with monitoring, backup, and priority response",
        description_uz="Kengaytirilgan qo\u2018llab-quvvatlash \u2014 kuzatuv, zaxira va ustuvor javob",
        is_popular=False, sort_order=4
    ),
    TariffPlan(
        name_ru="\u041a\u043e\u0440\u043f\u043e\u0440\u0430\u0442\u0438\u0432\u043d\u044b\u0439", name_en="Enterprise", name_uz="Korporativ",
        slug="enterprise", price_monthly=499000000,
        max_workstations=None,
        description_ru="\u041d\u0435\u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u043d\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0441 \u0432\u044b\u0434\u0435\u043b\u0435\u043d\u043d\u044b\u043c \u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043e\u043c \u0438 SLA 99.9%",
        description_en="Unlimited support with dedicated engineer and 99.9% SLA",
        description_uz="Cheksiz qo\u2018llab-quvvatlash, maxsus muhandis va 99.9% SLA",
        is_popular=False, sort_order=5
    ),
]
db.add_all(plans)
db.flush()

features_data = [
    (plans[0].id, [
        ("\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0440\u0430\u0431\u043e\u0447\u0438\u0445 \u0441\u0442\u0430\u043d\u0446\u0438\u0439", "Workstation support", "Ish stansiyalarini qo\u2018llab-quvvatlash", True),
        ("\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430", "Email support", "Email qo\u2018llab-quvvatlash", True),
        ("\u0412\u0440\u0435\u043c\u044f \u0440\u0435\u0430\u043a\u0446\u0438\u0438: 8 \u0447\u0430\u0441\u043e\u0432", "Response time: 8 hours", "Teskari vaqt: 8 soat", True),
        ("\u0421\u0435\u0442\u0435\u0432\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430", "Network support", "Tarmoq qo\u2018llab-quvvatlash", False),
        ("\u041c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433 24/7", "24/7 monitoring", "24/7 kuzatuv", False),
        ("\u0412\u044b\u0434\u0435\u043b\u0435\u043d\u043d\u044b\u0439 \u0438\u043d\u0436\u0435\u043d\u0435\u0440", "Dedicated engineer", "Maxsus muhandis", False),
        ("\u0420\u0435\u0437\u0435\u0440\u0432\u043d\u043e\u0435 \u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435", "Backup", "Zaxira nusxa", False),
        ("SLA 99.9%", "SLA 99.9%", "SLA 99.9%", False),
    ]),
    (plans[1].id, [
        ("\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0440\u0430\u0431\u043e\u0447\u0438\u0445 \u0441\u0442\u0430\u043d\u0446\u0438\u0439", "Workstation support", "Ish stansiyalarini qo\u2018llab-quvvatlash", True),
        ("\u0421\u0435\u0442\u0435\u0432\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430", "Network support", "Tarmoq qo\u2018llab-quvvatlash", True),
        ("\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430", "Email support", "Email qo\u2018llab-quvvatlash", True),
        ("\u0412\u0440\u0435\u043c\u044f \u0440\u0435\u0430\u043a\u0446\u0438\u0438: 4 \u0447\u0430\u0441\u0430", "Response time: 4 hours", "Teskari vaqt: 4 soat", True),
        ("\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u043e\u0432", "Server support", "Server qo\u2018llab-quvvatlash", False),
        ("\u041c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433 24/7", "24/7 monitoring", "24/7 kuzatuv", False),
        ("\u0412\u044b\u0434\u0435\u043b\u0435\u043d\u043d\u044b\u0439 \u0438\u043d\u0436\u0435\u043d\u0435\u0440", "Dedicated engineer", "Maxsus muhandis", False),
        ("SLA 99.9%", "SLA 99.9%", "SLA 99.9%", False),
    ]),
    (plans[2].id, [
        ("\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0440\u0430\u0431\u043e\u0447\u0438\u0445 \u0441\u0442\u0430\u043d\u0446\u0438\u0439", "Workstation support", "Ish stansiyalarini qo\u2018llab-quvvatlash", True),
        ("\u0421\u0435\u0442\u0435\u0432\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430", "Network support", "Tarmoq qo\u2018llab-quvvatlash", True),
        ("\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u043e\u0432", "Server support", "Server qo\u2018llab-quvvatlash", True),
        ("\u041a\u0438\u0431\u0435\u0440\u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c", "Cybersecurity", "Kiberxavfsizlik", True),
        ("\u0412\u0440\u0435\u043c\u044f \u0440\u0435\u0430\u043a\u0446\u0438\u0438: 2 \u0447\u0430\u0441\u0430", "Response time: 2 hours", "Teskari vaqt: 2 soat", True),
        ("\u041c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433 24/7", "24/7 monitoring", "24/7 kuzatuv", True),
        ("\u0412\u044b\u0434\u0435\u043b\u0435\u043d\u043d\u044b\u0439 \u0438\u043d\u0436\u0435\u043d\u0435\u0440", "Dedicated engineer", "Maxsus muhandis", False),
        ("SLA 99.9%", "SLA 99.9%", "SLA 99.9%", False),
    ]),
    (plans[3].id, [
        ("\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0440\u0430\u0431\u043e\u0447\u0438\u0445 \u0441\u0442\u0430\u043d\u0446\u0438\u0439", "Workstation support", "Ish stansiyalarini qo\u2018llab-quvvatlash", True),
        ("\u0421\u0435\u0442\u0435\u0432\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430", "Network support", "Tarmoq qo\u2018llab-quvvatlash", True),
        ("\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u043e\u0432", "Server support", "Server qo\u2018llab-quvvatlash", True),
        ("\u041a\u0438\u0431\u0435\u0440\u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c", "Cybersecurity", "Kiberxavfsizlik", True),
        ("\u0420\u0435\u0437\u0435\u0440\u0432\u043d\u043e\u0435 \u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435", "Backup", "Zaxira nusxa", True),
        ("\u0412\u0440\u0435\u043c\u044f \u0440\u0435\u0430\u043a\u0446\u0438\u0438: 1 \u0447\u0430\u0441", "Response time: 1 hour", "Teskari vaqt: 1 soat", True),
        ("\u041c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433 24/7", "24/7 monitoring", "24/7 kuzatuv", True),
        ("\u0412\u044b\u0434\u0435\u043b\u0435\u043d\u043d\u044b\u0439 \u0438\u043d\u0436\u0435\u043d\u0435\u0440", "Dedicated engineer", "Maxsus muhandis", True),
        ("SLA 99.9%", "SLA 99.9%", "SLA 99.9%", False),
    ]),
    (plans[4].id, [
        ("\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0440\u0430\u0431\u043e\u0447\u0438\u0445 \u0441\u0442\u0430\u043d\u0446\u0438\u0439", "Workstation support", "Ish stansiyalarini qo\u2018llab-quvvatlash", True),
        ("\u0421\u0435\u0442\u0435\u0432\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430", "Network support", "Tarmoq qo\u2018llab-quvvatlash", True),
        ("\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u043e\u0432", "Server support", "Server qo\u2018llab-quvvatlash", True),
        ("\u041a\u0438\u0431\u0435\u0440\u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c", "Cybersecurity", "Kiberxavfsizlik", True),
        ("\u0420\u0435\u0437\u0435\u0440\u0432\u043d\u043e\u0435 \u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435", "Backup", "Zaxira nusxa", True),
        ("\u041e\u0431\u043b\u0430\u0447\u043d\u044b\u0435 \u0441\u0435\u0440\u0432\u0438\u0441\u044b (M365)", "Cloud services (M365)", "Bulutli xizmatlar (M365)", True),
        ("\u0412\u0440\u0435\u043c\u044f \u0440\u0435\u0430\u043a\u0446\u0438\u0438: 30 \u043c\u0438\u043d", "Response time: 30 min", "Teskari vaqt: 30 daqiqa", True),
        ("\u041c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433 24/7", "24/7 monitoring", "24/7 kuzatuv", True),
        ("\u0412\u044b\u0434\u0435\u043b\u0435\u043d\u043d\u044b\u0439 \u0438\u043d\u0436\u0435\u043d\u0435\u0440", "Dedicated engineer", "Maxsus muhandis", True),
        ("SLA 99.9%", "SLA 99.9%", "SLA 99.9%", True),
    ]),
]

for tariff_id, feats in features_data:
    for idx, (ru, en, uz, inc) in enumerate(feats):
        db.add(TariffFeature(tariff_id=tariff_id, text_ru=ru, text_en=en, text_uz=uz, is_included=inc, sort_order=idx))

services = [
    ServiceCatalog(
        name_ru="\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0440\u0430\u0431\u043e\u0447\u0435\u0439 \u0441\u0442\u0430\u043d\u0446\u0438\u0438", name_en="Workstation Support", name_uz="Ish stansiyasi qo\u2018llab-quvvatlash",
        description_ru="\u0422\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u043e\u0434\u043d\u043e\u0439 \u0440\u0430\u0431\u043e\u0447\u0435\u0439 \u0441\u0442\u0430\u043d\u0446\u0438\u0438 (\u041f\u041a/\u043d\u043e\u0443\u0442\u0431\u0443\u043a)",
        description_en="Technical support for one workstation (PC/laptop)",
        description_uz="Bitta ish stansiyasi uchun texnik yordam",
        price=9900000, price_unit_ru="\u043c\u0435\u0441/\u0448\u0442", price_unit_en="mo/unit", price_uz="oy/birlik",
        price_type="monthly", is_quantifiable=True, min_quantity=1, max_quantity=500,
        category="workstations", icon_name="fa-desktop", sort_order=1
    ),
    ServiceCatalog(
        name_ru="\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430", name_en="Server Support", name_uz="Server qo\u2018llab-quvvatlash",
        description_ru="\u041f\u043e\u043b\u043d\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u043e\u0434\u043d\u043e\u0433\u043e \u0441\u0435\u0440\u0432\u0435\u0440\u0430 (\u0444\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u043e\u0433\u043e \u0438\u043b\u0438 \u0432\u0438\u0440\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u0433\u043e)",
        description_en="Full support for one server (physical or virtual)",
        description_uz="Bitta server uchun to\u2018liq qo\u2018llab-quvvatlash",
        price=24900000, price_unit_ru="\u043c\u0435\u0441/\u0448\u0442", price_unit_en="mo/unit", price_uz="oy/birlik",
        price_type="monthly", is_quantifiable=True, min_quantity=1, max_quantity=50,
        category="servers", icon_name="fa-server", sort_order=2
    ),
    ServiceCatalog(
        name_ru="\u0421\u0435\u0442\u0435\u0432\u043e\u0435 \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u0435", name_en="Network Maintenance", name_uz="Tarmoq xizmati",
        description_ru="\u041e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u0435 \u0441\u0435\u0442\u0435\u0432\u043e\u0439 \u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u044b (\u043a\u043e\u043c\u043c\u0443\u0442\u0430\u0442\u043e\u0440\u044b, \u043c\u0430\u0440\u0448\u0440\u0443\u0442\u0438\u0437\u0430\u0442\u043e\u0440\u044b, Wi-Fi)",
        description_en="Network infrastructure maintenance (switches, routers, Wi-Fi)",
        description_uz="Tarmoq infratuzilmasini xizmat ko\u2018rsatish",
        price=19000000, price_unit_ru="\u043c\u0435\u0441", price_unit_en="mo", price_uz="oy",
        price_type="monthly", is_quantifiable=False, min_quantity=1, max_quantity=1,
        category="network", icon_name="fa-network-wired", sort_order=3
    ),
    ServiceCatalog(
        name_ru="\u041a\u0438\u0431\u0435\u0440\u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c", name_en="Cybersecurity", name_uz="Kiberxavfsizlik",
        description_ru="\u0410\u043d\u0442\u0438\u0432\u0438\u0440\u0443\u0441, Firewall, \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433 \u0443\u0433\u0440\u043e\u0437, \u0440\u0435\u0430\u0433\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u043d\u0430 \u0438\u043d\u0446\u0438\u0434\u0435\u043d\u0442\u044b",
        description_en="Antivirus, Firewall, threat monitoring, incident response",
        description_uz="Antivirus, Firewall, tahdidlarni kuzatish, voqealarga javob",
        price=14900000, price_unit_ru="\u043c\u0435\u0441", price_unit_en="mo", price_uz="oy",
        price_type="monthly", is_quantifiable=False, min_quantity=1, max_quantity=1,
        category="security", icon_name="fa-shield-halved", sort_order=4
    ),
    ServiceCatalog(
        name_ru="\u0420\u0435\u0437\u0435\u0440\u0432\u043d\u043e\u0435 \u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435", name_en="Backup", name_uz="Zaxira nusxa",
        description_ru="\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430 \u0438 \u043c\u043e\u043d\u0438\u0442\u043e\u0440\u0438\u043d\u0433 \u0440\u0435\u0437\u0435\u0440\u0432\u043d\u043e\u0433\u043e \u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f \u0434\u0430\u043d\u043d\u044b\u0445",
        description_en="Data backup setup and monitoring",
        description_uz="Ma\u2019lumotlarni zaxira nusxalashni sozlash va kuzatish",
        price=9900000, price_unit_ru="\u043c\u0435\u0441", price_unit_en="mo", price_uz="oy",
        price_type="monthly", is_quantifiable=False, min_quantity=1, max_quantity=1,
        category="backup", icon_name="fa-cloud-arrow-up", sort_order=5
    ),
    ServiceCatalog(
        name_ru="\u041e\u0431\u043b\u0430\u0447\u043d\u044b\u0439 \u0441\u0435\u0440\u0432\u0438\u0441 (M365 / Google)", name_en="Cloud Service (M365 / Google)", name_uz="Bulutli xizmat (M365 / Google)",
        description_ru="\u041c\u0438\u0433\u0440\u0430\u0446\u0438\u044f \u0438 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 Microsoft 365 \u0438\u043b\u0438 Google Workspace",
        description_en="Migration and support for Microsoft 365 or Google Workspace",
        description_uz="Microsoft 365 yoki Google Workspace migratsiyasi va qo\u2018llab-quvvatlash",
        price=4900000, price_unit_ru="\u043c\u0435\u0441/\u043b\u0438\u0446\u0435\u043d\u0437\u0438\u044f", price_unit_en="mo/license", price_uz="oy/litsenziya",
        price_type="monthly", is_quantifiable=True, min_quantity=1, max_quantity=500,
        category="cloud", icon_name="fa-cloud", sort_order=6
    ),
    ServiceCatalog(
        name_ru="\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0430 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f", name_en="Equipment Setup", name_uz="Uskunani o\u2018rnatish",
        description_ru="\u0420\u0430\u0437\u043e\u0432\u0430\u044f \u0443\u0441\u043b\u0443\u0433\u0430: \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430 \u041f\u041a, \u043f\u0440\u0438\u043d\u0442\u0435\u0440\u0430, \u0441\u0435\u0440\u0432\u0435\u0440\u0430",
        description_en="One-time service: setup of PC, printer, server",
        description_uz="Bir martalik xizmat: PK, printer, serverni sozlash",
        price=29000000, price_unit_ru="\u0432\u044b\u0437\u043e\u0432", price_unit_en="call", price_uz="chaqiriq",
        price_type="one_time", is_quantifiable=True, min_quantity=1, max_quantity=50,
        category="one_time", icon_name="fa-screwdriver-wrench", sort_order=7
    ),
    ServiceCatalog(
        name_ru="\u0410\u0443\u0434\u0438\u0442 \u0418\u0422-\u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u044b", name_en="IT Infrastructure Audit", name_uz="IT infratuzilmasini audit",
        description_ru="\u041f\u043e\u043b\u043d\u044b\u0439 \u0430\u0443\u0434\u0438\u0442: \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430\u0446\u0438\u044f, \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c, \u043f\u0440\u043e\u0438\u0437\u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c",
        description_en="Full audit: documentation, security, performance",
        description_uz="To\u2018liq audit: hujjatlashtirish, xavfsizlik, samaradorlik",
        price=99000000, price_unit_ru="\u0430\u0443\u0434\u0438\u0442", price_unit_en="audit", price_uz="audit",
        price_type="one_time", is_quantifiable=False, min_quantity=1, max_quantity=1,
        category="one_time", icon_name="fa-magnifying-glass-chart", sort_order=8
    ),
]

db.add_all(services)
db.commit()
print(f"Seed OK: {len(plans)} plans, {sum(len(f[1]) for f in features_data)} features, {len(services)} services")
db.close()
