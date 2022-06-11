from socket import *
import os
import re
from bs4 import BeautifulSoup
import time

server_name = "173.230.149.18"
server_port = 23662

if os.path.exists("images"): # recreate the images directory if it exists
    os.system("rm -rf images")
    os.system("mkdir images")
else:
    os.system("mkdir images")

request_delay_array = []

start_time = time.time()


client_socket = socket(AF_INET, SOCK_STREAM)
# OS automatically sends client_address


timeStart1 = time.time()
client_socket.connect((server_name, server_port))

client_socket.sendall(b"GET /ecs152a.html HTTP/1.1\r\nHost:173.230.149.18\r\nX-Client-project:project-152A-part2\r\nConnection:close\r\n\r\n")


response_headers = ""

response = client_socket.recv(4096)

response_headers += response.decode('utf-8')

response_buffer = ""

# print("Response Headers:\n", response_headers)

regex = re.findall("Content-length: [0-9]+", response_headers)

content_length = int((regex[0].split(":"))[1])

while True:

    response = client_socket.recv(4096)

    decoded_response = response.decode('utf-8')

    if "Bathroom" in decoded_response:
        atf_html_end_time = time.time()

    response_buffer += decoded_response

    if len(response_buffer) >= content_length:
        break

timeEnd1 = time.time()
request_delay_array.append(timeEnd1 - timeStart1)

if os.path.exists("ecs152a.html"):
    os.system("rm ecs152a.html") # recreate the html file before every run

target_file = open("ecs152a.html", "a")

target_file.writelines(response_buffer)

target_file.close()

html_file = open("ecs152a.html", "r")

page = BeautifulSoup(html_file, "html.parser")
all_image_tags = page.find_all('img')

all_image_srcs = []
for i in range(len(all_image_tags)):
    all_image_srcs.append(all_image_tags[i]["src"])

html_file.close()

client_socket.close()


# THE RESPONSE HEADER SENT TO PROJECT SERVER IS "Content-length"
# THE RESPONSE HEADER SENT TO OTHER SERVERS IS "Content-Length"


# IMAGE DOWNLOADING FOR THE 3 IMAGES ON DIFFERENT HOSTS STARTS HERE

count = 0
for i in range(len(all_image_srcs[:3])):
    if count == 0:
        allIndoors_start_time = time.time()

    url_regex = re.findall("^((http[s]?|ftp):\/)?\/?([^:\/\s]+)((\/\w+)*\/)([\w\-\.]+[^#?\s]+)(.*)?(#[\w\-]+)?$", all_image_srcs[i])
    hostname = url_regex[0][2]
    path = url_regex[0][3] + url_regex[0][5]

    filename_regex = re.findall("^\/(.+\/)*(.+)\.(.+)$", path)

    image_name = filename_regex[0][1] + "." + filename_regex[0][2]

    # print("hostname:", hostname)
    # print("path:", path)
    # print("image_name:", image_name)
    # print("\n")

    server_name = hostname
    server_port = 80 # cuz HTTP
    
    client_socket = socket(AF_INET, SOCK_STREAM)

    timeStart2 = time.time()

    client_socket.connect((server_name, server_port))

    http_query_string = b"GET " + str.encode(path) +  b" HTTP/1.1\r\nHost:" + str.encode(hostname) + b"\r\n\r\n"

    client_socket.sendall(http_query_string)

    img_response = client_socket.recv(4096)

    img_response_headers = img_response

    hope_arr = img_response_headers.split(b'\r\n\r\n')

    regex = re.findall("Content-Length: [0-9]+", str(hope_arr[0]))

    content_length = int((regex[0].split(":"))[1])

    img_response_buffer = hope_arr[1]

    while True:

        response = client_socket.recv(4096)

        decoded_response = response

        img_response_buffer += decoded_response

        if len(img_response_buffer) >= content_length:
            break

    if count == 0:
        end_time = time.time()
        # print("ATF PLT:", (atf_html_end_time - start_time) + (end_time-allIndoors_start_time))
        atf_plt = (atf_html_end_time - start_time) + (end_time-allIndoors_start_time)
        count += 1

    timeEnd2 = time.time()
    request_delay_array.append(timeEnd2 - timeStart2)

    target_file = open("images/" + image_name, "wb")
    # print("image name (diff host):", "images/" + image_name)

    target_file.write(img_response_buffer)

    target_file.close()

    client_socket.close()


# IMAGE DOWNLOADING FOR THE 3 IMAGES ON DIFFERENT HOSTS ENDS HERE



server_name = "173.230.149.18"
server_port = 23662

# Image Downloading same host STARTS
# reconnect for each image

same_host_images = all_image_srcs[3:]

# print("GETS TO BEFORE THE FOR LOOP")

for i in range(len(same_host_images)):

    client_socket = socket(AF_INET, SOCK_STREAM)

    timeStart3 = time.time()

    client_socket.connect((server_name, server_port))

    request_to_send = b"GET /" + str.encode(same_host_images[i]) + b" HTTP/1.1\r\nHost:" + str.encode(server_name) + b"\r\nX-Client-project:project-152A-part2\r\nConnection:close\r\n\r\n"

    client_socket.sendall(request_to_send)

    img_response = client_socket.recv(4096)

    img_response_headers = img_response

    hope_arr = img_response_headers.split(b'\r\n\r\n')


    img_response_buffer = b''

    if len(hope_arr) > 1:
        img_response_buffer = hope_arr[1]

    regex = re.findall("Content-length: [0-9]+", str(hope_arr[0]))

    content_length = int((regex[0].split(":"))[1])


    while True:

        response = client_socket.recv(4096)

        decoded_response = response

        img_response_buffer += decoded_response

        if len(img_response_buffer) >= content_length:
            break

    timeEnd3 = time.time()
    request_delay_array.append(timeEnd3 - timeStart3)

    target_file = open(same_host_images[i], "wb")
    # print("image name (same host):", same_host_images[i])
    

    target_file.write(img_response_buffer)

    target_file.close()

    client_socket.close()

# Image Downloading same host Ends


end_time = time.time()

print("\n***************************************************")

print("\nHTTP Client Version: Non-Persistent HTTP")

print("\nTotal PLT =", end_time - start_time)

print("\nAverage Request Delay =", sum(request_delay_array)/len(request_delay_array))

print("\nATF PLT =", atf_plt)

print("\nRPS =", len(request_delay_array)/(end_time - start_time), "\n")

# print("\nLength of Request Delay Array:", len(request_delay_array), "\n")

print("***************************************************\n")