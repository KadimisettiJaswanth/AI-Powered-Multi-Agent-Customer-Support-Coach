"""
Pre-defined Scenarios & Personas for Simulator Mode and Replay Mode.
"""

SCENARIOS = [
    {
        "id": "billing-double-charge",
        "title": "Double Billing & Urgent Refund",
        "category": "Billing",
        "difficulty": "Hard",
        "product_context": "SaaS Subscription Billing & Payments",
        "customer_persona": "Angry customer who noticed their credit card was charged twice ($99 each) this month and demands immediate refund.",
        "initial_message": "I just checked my bank statement and you guys charged me $99 TWICE this month! I want an immediate refund for the second charge right now or I am disputing this with my bank!",
        "replay_transcript": [
            {
                "turn": 1,
                "customer": "I just checked my bank statement and you guys charged me $99 TWICE this month! I want an immediate refund for the second charge right now or I am disputing this with my bank!",
                "agent": "Hello! I understand how frustrating a double charge can be. Let me look into your account immediately to verify the charges and initiate the refund process for you right away."
            },
            {
                "turn": 2,
                "customer": "Thank you. How long will the refund take to show up in my account?",
                "agent": "Refunds typically process within 3-5 business days depending on your bank. I have issued the refund confirmation number #RF-99824 for your records."
            },
            {
                "turn": 3,
                "customer": "Awesome, I appreciate the quick help!",
                "agent": "You're very welcome! Is there anything else I can assist you with today?"
            }
        ]
    },
    {
        "id": "tech-downtime",
        "title": "API Outage & Service Interruption",
        "category": "Technical",
        "difficulty": "Medium",
        "product_context": "Cloud API Gateway & Developer Dashboard",
        "customer_persona": "Stressed developer whose production app is failing due to API timeouts.",
        "initial_message": "Our entire mobile app is down because your API is returning 504 Gateway Timeouts! Is there a known outage right now?",
        "replay_transcript": [
            {
                "turn": 1,
                "customer": "Our entire mobile app is down because your API is returning 504 Gateway Timeouts! Is there a known outage right now?",
                "agent": "I apologize for the disruption! Our infrastructure team is currently investigating elevated response times in US-East region. We recommend switching your SDK traffic to US-West failover endpoint."
            },
            {
                "turn": 2,
                "customer": "Where can I find the failover endpoint configuration?",
                "agent": "You can update the base URL in your SDK configuration to `https://us-west-api.service.com/v1`. Full details are in our troubleshooting documentation."
            }
        ]
    },
    {
        "id": "account-compromise",
        "title": "Unrecognized Login Alert",
        "category": "Security & Legal",
        "difficulty": "Urgent",
        "product_context": "User Security & Authentication Portal",
        "customer_persona": "Anxious user who received a security email about a login from an unknown device in another country.",
        "initial_message": "I received an email saying someone logged into my account from Russia! I didn't authorize this! Did my password get leaked?",
        "replay_transcript": [
            {
                "turn": 1,
                "customer": "I received an email saying someone logged into my account from Russia! I didn't authorize this! Did my password get leaked?",
                "agent": "I'm immediately securing your account. I have terminated all active sessions and sent a secure password reset link to your registered email address."
            }
        ]
    },
    {
        "id": "cancellation-retention",
        "title": "Subscription Cancellation Request",
        "category": "Account",
        "difficulty": "Easy",
        "product_context": "Monthly Premium Tier Plan",
        "customer_persona": "Price-sensitive customer wanting to downgrade or cancel due to high cost.",
        "initial_message": "Hi, I'd like to cancel my subscription. It's getting too expensive for my small team.",
        "replay_transcript": [
            {
                "turn": 1,
                "customer": "Hi, I'd like to cancel my subscription. It's getting too expensive for my small team.",
                "agent": "I understand! Before you cancel, we have a Starter tier for small teams at $19/month with all core features. Would you like me to switch your plan so you save 60%?"
            }
        ]
    }
]


def get_scenario_by_id(scenario_id: str) -> dict | None:
    for sc in SCENARIOS:
        if sc["id"] == scenario_id:
            return sc
    return None
