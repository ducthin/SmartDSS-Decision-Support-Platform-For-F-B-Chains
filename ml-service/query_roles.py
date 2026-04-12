import sys
err=[]

def run_with_mysql_connector():
    import mysql.connector as mc
    conn=mc.connect(host='localhost',port=3306,user='root',password='ducthinh123',database='smartdss')
    cur=conn.cursor()
    cur.execute('SHOW CREATE TABLE roles')
    row=cur.fetchone()
    print('SHOW CREATE TABLE roles:')
    print(row[1] if row and len(row)>1 else row)
    cur.execute('SELECT id,name FROM roles ORDER BY id')
    print('SELECT id,name FROM roles ORDER BY id:')
    for r in cur.fetchall():
        print(r)
    cur.close()
    conn.close()


def run_with_pymysql():
    import pymysql
    conn=pymysql.connect(host='localhost',port=3306,user='root',password='ducthinh123',database='smartdss')
    cur=conn.cursor()
    cur.execute('SHOW CREATE TABLE roles')
    row=cur.fetchone()
    print('SHOW CREATE TABLE roles:')
    print(row[1] if row and len(row)>1 else row)
    cur.execute('SELECT id,name FROM roles ORDER BY id')
    print('SELECT id,name FROM roles ORDER BY id:')
    for r in cur.fetchall():
        print(r)
    cur.close()
    conn.close()

try:
    run_with_mysql_connector()
    sys.exit(0)
except Exception as e:
    err.append(('mysql.connector', str(e)))

try:
    run_with_pymysql()
    sys.exit(0)
except Exception as e:
    err.append(('pymysql', str(e)))

print('DB query failed:', err)
sys.exit(1)
