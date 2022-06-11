import random
from socket import *
import time

server_name = "173.230.149.18"
server_port = 12000

client_socket = socket(AF_INET, SOCK_DGRAM)
# OS automatically sends client_address

request = "ping"

rtt_array = []

success_count = 0

failure_count = 0

timeout_count = 0

timeout_seconds = 10

client_socket.settimeout(10) # change this to 10 seconds

ping_count = 1
while ping_count <= 10:

    try:

        time_sent = time.time()

        print("The current time is:", time_sent, "and this is message number:", ping_count)

        client_socket.sendto(request.encode('utf-8'), (server_name, server_port))

        response = client_socket.recvfrom(4096)
        time_received = time.time()

        print("Uppercase Message from the Server:   ", response[0])
        # print(response[0].decode('utf-8')) # the way to print the repsonse without the b

        if response[0].decode('utf-8') != "PING":
            failure_count += 1

        rtt = time_received - time_sent

        print("The Round Trip Time is:", rtt, "seconds")

        rtt_array.append(rtt)

        ping_count += 1
        success_count += 1

    except:
        failure_count += 1
        timeout_count += 1
        
        if timeout_seconds >= 600:
            print("Program timed out for way too long!")
            exit(1)

        time.sleep(timeout_seconds)

        timeout_seconds = timeout_seconds * (2 ** timeout_count) + random.uniform(0,1)
        print("Timed out! The timeout time was:", client_socket.timeout, "seconds.")

print("the program is done")
print("Stored RTTs are:", rtt_array)
print("Total number of successful packets is:", success_count)
print("Max RTT is:", max(rtt_array), "seconds")
print("Min RTT is:", min(rtt_array), "seconds")
print("Sum of all RTTs is:", sum(rtt_array), "seconds")
print("Average Round Trip Time is:", sum(rtt_array)/len(rtt_array), "seconds")
# print("Total number of packets lost is:", len(rtt_array) - success_count)
print("Total number of packets lost is:", failure_count)

client_socket.close()

