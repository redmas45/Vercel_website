import os

base = 'c:/Users/admin/Desktop/Vercel_website/out'
pages = {
    'support': 'Support',
    'frequently-asked-questions': 'FAQ',
    'shipping-policy': 'Shipping Policy',
    'return-policy': 'Return Policy'
}

html_template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{title} - AI-KART</title>
    <style>
        body {{ font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }}
        h1 {{ border-bottom: 1px solid #eaeaea; padding-bottom: 10px; }}
    </style>
</head>
<body>
    <h1>{title}</h1>
    <p>This is a placeholder page for {title}. Content coming soon.</p>
    <p><a href="/">Return to Home</a></p>
</body>
</html>"""

for folder, title in pages.items():
    dir_path = os.path.join(base, folder)
    os.makedirs(dir_path, exist_ok=True)
    with open(os.path.join(dir_path, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html_template.format(title=title))
