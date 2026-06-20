from datetime import datetime
import random
import string


def generate_bill_no(prefix: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_str = ''.join(random.choices(string.digits, k=4))
    return f"{prefix}{timestamp}{random_str}"


def generate_appointment_no() -> str:
    return generate_bill_no("AP")


def generate_weighing_no() -> str:
    return generate_bill_no("WGH")


def generate_route_no() -> str:
    return generate_bill_no("RT")


def generate_proof_no() -> str:
    return generate_bill_no("DP")


def generate_exception_no() -> str:
    return generate_bill_no("EX")


def generate_settlement_no() -> str:
    return generate_bill_no("ST")
