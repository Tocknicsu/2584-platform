# 2584 Platform

## How to install

```
git clone https://github.com/Tocknicsu/2584-platform.git
sudo pip3 install -r requirements.txt
cd backend
cp config.py.sample config.py
python3 server.py
```

The web url will be http://yourip:12345/ and the 2584 client should connect 12346 port.
If you want to change it, just modify the `config.py`.
