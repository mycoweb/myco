from flask import Flask, request, send_file, jsonify, send_from_directory
import os
import datetime
from waitress import serve
import logging
import base64
from flask_httpauth import HTTPBasicAuth
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
auth = HTTPBasicAuth()

# Minimal Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG) # Set logging level to DEBUG

JOURNAL_FILE = 'journal.txt'
ENTRY_DELIMITER = '\n--- '
IMG_FOLDER = 'img'

# --- Basic Authentication Setup ---
users = {
    "admin": generate_password_hash("myco") # Replace with your desired password
}

@auth.verify_password
def verify_password(username, password):
    if username in users and check_password_hash(users.get(username), password):
        return username
    return None

@auth.error_handler
def auth_error():
    return "", 401, {"WWW-Authenticate": 'Basic realm="Login Required"'}

# --- Journal Entry Functions ---
def read_journal_entries():
    try:
        with open(JOURNAL_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        return [entry.strip() for entry in content.lstrip(ENTRY_DELIMITER).split(ENTRY_DELIMITER) if entry.strip()]
    except FileNotFoundError:
        return []

def write_journal_entries(entries):
    with open(JOURNAL_FILE, 'w', encoding='utf-8') as f:
        f.write(ENTRY_DELIMITER.join(entries))
        if entries:
            f.write(ENTRY_DELIMITER)

@app.route('/journal.txt', methods=['GET', 'POST'])
def journal():
    if request.method == 'POST':
        try:
            logger.debug(f"Received POST request to /journal.txt with data: {request.data.decode('utf-8')}")
            with open(JOURNAL_FILE, 'a', encoding='utf-8') as f:
                f.write(request.data.decode('utf-8'))
            return 'OK'
        except Exception as e:
            logger.error(f"Error in POST /journal.txt: {e}")
            return jsonify({'status': 'error', 'message': str(e)}), 500
    else:
        return send_file(JOURNAL_FILE)

@app.route('/delete/<string:encoded_entry>', methods=['DELETE'])
def delete(encoded_entry):
    logger.debug(f"Received DELETE request for encoded entry: {encoded_entry}")
    try:
        decoded_entry_content = base64.b64decode(encoded_entry).decode('utf-8')
        logger.debug(f"Decoded entry content: {decoded_entry_content}")
        updated_entries_list = []
        deleted = False
        with open(JOURNAL_FILE, 'r', encoding='utf-8') as f:
            all_lines = f.read().splitlines()
            i = 0
            while i < len(all_lines):
                if all_lines[i].startswith('--- '):
                    timestamp_line = all_lines[i]
                    content_lines = []
                    i += 1
                    while i < len(all_lines) and not all_lines[i].startswith('--- '):
                        content_lines.append(all_lines[i])
                        i += 1
                    current_content = '\n'.join(content_lines).strip()
                    logger.debug(f"Comparing with current content: '{current_content}'")
                    if current_content == decoded_entry_content:
                        logger.debug(f"Match found for deletion: '{current_content}'")
                        deleted = True
                    else:
                        updated_entries_list.append(timestamp_line)
                        updated_entries_list.extend(content_lines)
                else:
                    i += 1

        with open(JOURNAL_FILE, 'w', encoding='utf-8') as f:
            f.write('\n'.join(updated_entries_list) + '\n')
        if deleted:
            logger.info(f"Successfully deleted entry: '{decoded_entry_content}'")
            return jsonify({'status': 'OK'})
        else:
            logger.warning(f"No matching entry found for deletion: '{decoded_entry_content}'")
            return jsonify({'status': 'not_found', 'message': 'Entry not found'}), 404
    except FileNotFoundError:
        logger.error("Error: journal.txt not found")
        return jsonify({'status': 'error', 'message': 'File not found'}), 404
    except Exception as e:
        logger.error(f"Error in DELETE /delete: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


# --- Basic Routes ---
@app.route('/')
@app.route('/index.html')
def index():
    return send_file('index.html')

@app.route('/admin.html')
@auth.login_required
def admin():
    return send_file('admin.html')

@app.route('/radio.html')
def radio():
    return send_file('radio.html')

# Serve files from /img
@app.route('/img/<path:filename>')
def serve_img(filename):
    return send_from_directory('img', filename)

if __name__ == '__main__':
    if not os.path.exists(JOURNAL_FILE):
        with open(JOURNAL_FILE, 'w', encoding='utf-8') as f:
            f.write('')

if __name__ == '__main__':
    if not os.path.exists(ARTIST_FILE):
        with open(ARTIST_FILE, 'w', encoding='utf-8') as f:
            f.write('')

    logger.info(f"Server started on http://192.168.1.117:7781")
    serve(app, host='192.168.1.117', port=7781)