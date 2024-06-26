let agent = AnCti.newAgent();
let webphone;
let audio = new Audio();
audio.autoplay = true;
let ringer;
let debounceTimeout;
let remoteStream;

document.addEventListener("DOMContentLoaded", function () {
    try {
        agent.startApplicationSession({
            username: "diego@idb.com.vn",
            password: "Abcd13579;;",
            url: "wss://pbx-stg.oncallcx.vn/cti/ws"
        });

        navigator.mediaDevices.enumerateDevices().then(mediaDevices => {
            mediaDevices
                .filter(({kind}) => kind === "audioinput")
                .forEach(dev => {
                    console.log(`${dev.label} => ${dev.deviceId}`);
                });
        });

        agent.on("applicationsessionstarted", () => {
            console.log("Phiên đăng ký đã bắt đầu");
            logAgentConfiguration();

            webphone = agent.getDevice("sip:1852@term.339");
            if (webphone) {
                try {
                    webphone.monitorStart({rtc: true});
                    console.log("Đã bắt đầu giám sát thiết bị 1852");
                } catch (error) {
                    console.log("Lỗi giám sát thiết bị 1852:", error);
                }
            } else {
                console.error("Lỗi: webphone sip:1852@term.339 không được xác định");
            }

            let agentDeskphone = agent.getDevice("sip:1857@term.337");
            if (agentDeskphone) {
                try {
                    agentDeskphone.monitorStart({rtc: true});
                    console.log("Đã bắt đầu giám sát điện thoại bàn của tổng đài viên 1857");
                } catch (error) {
                    console.log("Lỗi giám sát điện thoại bàn của tổng đài viên 1857:", error);
                }
            } else {
                console.error("Lỗi: sip:1857@term.337 Không xác định");
            }
        });

        agent.on("applicationsessionterminated", (event) => {
            if (event.reason === "invalidApplicationInfo") {
                console.log("Kiểm tra lại thông tin đăng nhập");
            }
        });

        agent.on("error", (error) => {
            console.log("Lỗi agent:", error);
        });

        agent.on("call", (event) => {
            console.log("Đã nhận được sự kiện cuộc gọi:", event);
            handleCallEvent(event);
        });

        agent.on("statechanged", (event) => {
            console.log("Đã nhận được sự kiện thay đổi trạng thái:", event);
        });

        agent.on('remotestream', (event) => {
            console.log("Đã nhận được luồng từ xa:", event.stream);
            if (event.stream) {
                remoteStream = event.stream;
                audio.srcObject = remoteStream;
                audio.play().catch(e => console.warn("Không thể phát âm thanh:", e));

                // Thêm sự kiện connectionstatechange để theo dõi trạng thái kết nối
                remoteStream.getTracks().forEach(track => {
                    track.onended = () => console.log(`Theo dõi ${track.kind} đã kết thúc`);
                });

                remoteStream.onremovetrack = () => {
                    console.log("Đã xóa âm thanh khỏi luồng từ xa");
                };
            } else {
                console.warn("Không có luồng từ xa nào");
            }
        });

        agent.on("iceconnectionstatechange", (event) => {
            console.log("Trạng thái kết nối ICE đã thay đổi thành", event.target.iceConnectionState);
            if (event.target.iceConnectionState === "failed" || event.target.iceConnectionState === "disconnected") {
                console.warn("Kết nối ICE không thành công hoặc bị ngắt kết nối");
            }
        });

        agent.on("signalingstatechange", (event) => {
            console.log("Trạng thái báo hiệu thay đổi thành", event.target.signalingState);
        });

    } catch (error) {
        console.error("Lỗi khi bắt đầu phiên ứng dụng:", error);
    }
});

function logAgentConfiguration() {
    // Log thông tin agent
    console.log("Agent configuration:", agent);
    console.log("Agent ID:", agent.agentId);
    console.log("Agent username:", agent.username);
    console.log("Agent status:", agent.status);
    console.log("Agent devices:", agent.devices);

    // Log thông tin thiết bị của agent
    let devices = agent.getDevices();
    console.log("Danh sách thiết bị của Agent:");
    devices.forEach((device, index) => {
        console.log(`Thiết bị ${index + 1}:`);
        console.log("Device:", device);
        console.log("Device ID:", device.deviceID);
        console.log("Device type:", device.deviceType);
        console.log("Device status:", device.status);
        console.log("Device capabilities:", device.capabilities);
    });

    // Log trạng thái kết nối
    console.log("Trạng thái kết nối:", agent.connectionStatus);
}

function handleCallEvent(event) {
    let call = event.call;
    console.log(call);
    console.log(call.localConnectionInfo);
    switch (call.localConnectionInfo) {
        case 'initiated': {
            RemoveCall(call.callID);
            Dialing_PBX(call.name, "", call.number, call.callID, call.agent.devices[0].publicNumber, call.agent.devices[1].deviceID, call.agent.devices[0].deviceID);
            break;
        }
        case 'alerting': {
            console.log(`Cuộc gọi đến từ ${call.number} ${call.name}`);
            break;
        }
        case 'connected': {
            console.log(`Đã kết nối:`, call.agent.devices[0].deviceID);
            Connected_PBX(call.name, call.number, call.callID, call.device.publicNumber, event.content, call.device.deviceId, call.agent.devices[0].deviceID);
            if (remoteStream) {
                audio.srcObject = remoteStream;
                audio.play().catch(e => console.warn("Không thể phát âm thanh:", e));
            } else {
                console.warn("Luồng từ xa không khả dụng khi kết nối");
            }
            break;
        }
        case 'fail': {
            console.log(`Cuộc gọi không thành công, nguyên nhân là ${event.content.cause}`);
            clearRingtone();
            break;
        }
        case 'hold': {
            console.log(`Giữ cuộc gọi đến ${call.number}`);
            break;
        }
        case 'null': {
            console.log(`Gọi tới ${call.number} đã kết thúc`);
            break;
        }
    }
}

function Join_Call(callDetails, joiningDeviceID) {
    console.log("callDetails: ", callDetails);
    console.log("joiningDeviceID: ", joiningDeviceID);

    const joinCallOptions = {
        autoOriginate: "doNotPrompt",
        audio: true,
        video: false,
        participationType: "Listen"
    };

    try {
        console.log('webphone:', webphone);
        const joinCallMsg = {
            JoinCall: {
                activeCall: {
                    callID: callDetails.callID,
                    deviceID: callDetails.device.deviceID
                },
                joiningDevice: joiningDeviceID, // Thiết bị tham gia
                autoOriginate: joinCallOptions.autoOriginate,
                participationType: joinCallOptions.participationType,
                constraints: {
                    audio: joinCallOptions.audio,
                    video: joinCallOptions.video
                }
            }
        };
        console.log("JoinCall Message: ", joinCallMsg);
        webphone.agent.invoke(joinCallMsg);
        console.log("Đã tham gia cuộc gọi:", callDetails.callID);
    } catch (error) {
        console.error("Lỗi khi tham gia cuộc gọi:", error);
    }
}


function Connected_PBX(contact_name, contact_number, callID, callingNumber, deviceID, callingDeviceID, joiningDeviceID) {
    AppendCall({
        callID,
        contact_number,
        callingNumber,
        destinationCall3CX: "Outbound",
        deviceID,
        joiningDeviceID,
        status: "connected"
    });
}

let liveCalls = [];

function AppendCall(call) {
    const existingCallIndex = liveCalls.findIndex(c => c.callID === call.callID);
    if (existingCallIndex === -1) {
        call.startTime = new Date();
        liveCalls.push(call);
        liveCalls.length > 0 && displayCallInfo();
    } else {
        console.log("Cuộc gọi đã tồn tại");
    }
}

async function RemoveCall(callID) {
    liveCalls = liveCalls.filter(call => {
        return call.callID !== callID;
    });
    if (liveCalls.length >= 1) {
        displayCallInfo();
    }
}

function displayCallInfo() {
    const callTableBody = document.getElementById("callTable").getElementsByTagName('tbody')[0];
    callTableBody.innerHTML = '';

    liveCalls.forEach(call => {
        const rowData = document.createElement("tr");
        const durationCell = document.createElement("td");
        const actionCell = document.createElement("td");
        durationCell.classList.add("monitoringTableData");
        durationCell.style.width = "115px";
        actionCell.classList.add("monitoringTableData");

        console.log("Bảng cập nhật GỌI --- +++", call);

        rowData.innerHTML = `
            <td class="monitoringTableData">${call.callID}</td>
            <td class="monitoringTableData">${call.callingNumber}</td>
            <td class="monitoringTableData">${call.contact_number}</td>
            <td class="monitoringTableData">${call.destinationCall3CX}</td>
        `;

        const monitorButton = document.createElement("button");
        monitorButton.classList.add("btnAction");
        monitorButton.textContent = "Monitor";
        monitorButton.addEventListener("click", () => {
            console.log("Giám sát cuộc gọi bằng ID", call.callID);
        });

        const joinCallButton = document.createElement("button");
        joinCallButton.classList.add("btnAction");
        joinCallButton.textContent = "Join Call";
        joinCallButton.addEventListener("click", () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                console.log(call);
                Join_Call({
                        device: {
                            deviceID: call.deviceID
                        },
                        callID: call.callID,
                    },
                    call.deviceId // thiết bị dùng để nghe lén
                );
            }, 300);
        });

        const wrapper = document.createElement("div");
        wrapper.classList.add("monitoringTableActions");

        wrapper.appendChild(monitorButton);
        wrapper.appendChild(joinCallButton);
        actionCell.appendChild(wrapper);

        rowData.appendChild(durationCell);
        rowData.appendChild(actionCell);
        callTableBody.appendChild(rowData);
    });

    liveCalls.forEach(call => {
        const duration = document.createElement("span");
        duration.classList.add("timer");
        duration.textContent = getCallDuration(call.startTime);

        // Thay đổi từ querySelector sang getElementsByTagName và duyệt qua các phần tử
        const rows = document.getElementById("callTable").getElementsByTagName('tr');
        for (let row of rows) {
            if (row.getElementsByTagName('td')[0] && row.getElementsByTagName('td')[0].textContent === call.callID) {
                if (row.getElementsByTagName('td')[4]) {
                    row.getElementsByTagName('td')[4].appendChild(duration);
                }
                break;
            }
        }
    });
}

function getCallDuration(startTime) {
    const durationInSeconds = (new Date() - new Date(startTime)) / 1000;
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = Math.floor(durationInSeconds % 60);

    return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
}

function padZero(num) {
    return num < 10 ? '0' + num : num;
}

function clearRingtone() {
    if (ringer) {
        ringer.pause();
        ringer.src = '';
        ringer.load();
        ringer = null;
    }
}

function Dialing_PBX(contact_name, contact_type, contact_number, callID, callingNumber, deviceID, deviceId) {
    if (contact_number) {
        console.log("Quay số PBX");
        AppendCall({
            callID,
            contact_number,
            callingNumber,
            destinationCall3CX: "Outbound",
            deviceID,
            deviceId
        });
    }
}

function checkAudioDevices() {
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            devices.forEach(device => {
                if (device.kind === 'audioinput') {
                    console.log(`Thiết bị đầu vào âm thanh: ${device.label} id = ${device.deviceId}`);
                }
                if (device.kind === 'audiooutput') {
                    console.log(`Thiết bị đầu ra âm thanh: ${device.label} id = ${device.deviceId}`);
                }
            });
        })
        .catch(err => {
            console.error("Lỗi khi liệt kê thiết bị:", err);
        });
}

document.addEventListener("DOMContentLoaded", checkAudioDevices);
