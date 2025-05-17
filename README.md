# 🚀 Simple SCP Action

This GitHub Action deploys local files to a remote Linux server using SCP.

## 📦 Features

- Move files to a local folder
- Compress the local folder into a `.tar.gz` archive
- Optionally cleans remote directory before extracting
- Automatically creates the remote directory if it doesn’t exist
- Upload using either **SSH private key** or **password**

---

## 🛠 Inputs

| Name          | Required | Description                                                   |
|---------------|----------|---------------------------------------------------------------|
| `HOST`        | ✅ yes   | Remote server IP or hostname                                  |
| `USERNAME`    | ✅ yes   | SSH username                                                  |
| `PRIVATE_KEY` | ❌ no    | SSH private key (use instead of `password`)                   |
| `PASSWORD`    | ❌ no    | SSH password (use instead of `privateKey`)                    |
| `PORT`        | ❌ no    | SSH port (default: `22`)                                      |
| `LOCAL_DIR`   | ✅ yes   | Local directory path to archive and upload                    |
| `FILES`       | ✅ yes   | Local files to upload (separated by comma)                    |
| `REMOTE_DIR`  | ✅ yes   | Remote directory path to extract archive                      |
| `CLEAN_REMOTE`| ❌ no    | `true` to delete all files in remote directory before upload  |

> You must provide either `PRIVATE_KEY` **or** `PASSWORD`.

---

## 🧪 Example Usage

Create workflow file `.github/workflows/your-workflow.yml`

1. Using SSH private key, upload all files in LOCAL_DIR

```yaml
name: Deploy via SCP

on:
  push:
    branches: [ "master" ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Deploy to server
        uses: wjftu/simple-scp-action
        with:
          HOST: ${{ secrets.HOST }}
          USERNAME: root
          PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}
          LOCAL_DIR: ./dist
          REMOTE_DIR: /var/www/myapp
          CLEAN_REMOTE: true
          PORT: 2222
```

2. Use SSH password

```yaml
steps:
    - name: Checkout code
    uses: actions/checkout@v4
    - name: Deploy to server
    uses: wjftu/simple-scp-action
    with:
        HOST: ${{ secrets.HOST }}
        USERNAME: ubuntu
        PASSWORD: ${{ secrets.PASSWORD }}
        LOCAL_DIR: ./publish
        REMOTE_DIR: /var/www/myapp
        CLEAN_REMOTE: false
        PORT: 22
```

3. Upload FILES

```yaml
steps:
    - name: Checkout code
    uses: actions/checkout@v4
    - name: Deploy to server
    uses: wjftu/simple-scp-action
    with:
        HOST: ${{ secrets.HOST }}
        USERNAME: ubuntu
        PASSWORD: ${{ secrets.PASSWORD }}
        FILES: 1.txt,dir1/*,dir2/*.txt
        REMOTE_DIR: /var/www/myapp
        CLEAN_REMOTE: false
        PORT: 22
```

---

## Security Notes

Use GitHub Secrets to securely store your privateKey, password, and host.

SSH keys are deleted automatically after each run.

**How to set secrets for GitHub actions?**

- Go to your repository on GitHub.
- Click on Settings tab.
- On the left sidebar, click Secrets and variables → Actions.
- Click New repository secret.
- Enter a Name (e.g., PRIVATE_KEY).
- Paste the Secret value
- Click Add secret.


---

### Add SSH key to Server

Using an SSH key is the best practice for secure, automated, and robust authentication. 

```
# generate an ed25519 key 
ssh-keygen -t ed25519 -f deploy_key 

# generate an RSA key
ssh-keygen -t rsa -b 2048 -f deploy_key
```

If you have access to the remote server:

```
ssh-copy-id -i ~/.ssh/deploy_key.pub username@host
```

Or manually copy content of deploy_key.pub to `~/.ssh/authorized_key` on server.

Test your SSH key

```
ssh -i deploy_key username@host
```