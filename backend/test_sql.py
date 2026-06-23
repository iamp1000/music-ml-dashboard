import pymysql
import ssl

# Credentials provided by user
host = "gateway01.ap-southeast-1.prod.aws.tidbcloud.com"
port = 4000
user = "2u2TczwT65g96ET.root"
password = "Fs9jesHk5BPSdF2l"
database = "sys"

try:
    print(f"Connecting to {host}...")
    # Connecting to TiDB Serverless requires SSL
    connection = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        ssl_verify_cert=True,
        ssl_verify_identity=True
    )
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT VERSION()")
        result = cursor.fetchone()
        print(f"Connected to TiDB successfully! Version: {result[0]}")
        
    connection.close()
except Exception as e:
    print(f"Failed to connect to TiDB: {e}")
