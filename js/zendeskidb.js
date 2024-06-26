function SessionAppRestart() {
    try {
        if (typeof (Storage) !== "undefined") {
            // Store
            sessionStorage.setItem("checkLastTicket", false);
            sessionStorage.setItem("lastTicket", "0");
            console.log("khởi động lại ứng dụng phiên: Khởi động lại phiên");
            console.log("khởi động lại ứng dụng phiên: kiểm tra vé cuối cùng " + sessionStorage.getItem("checkLastTicket") + " vé cuối cùng: " + sessionStorage.getItem("lastTicket"));

        } else {
            console.log("khởi động lại ứng dụng phiên: Xin lỗi, trình duyệt của bạn không hỗ trợ Web Storage...");
        }
    } catch (err) {
        console.log("ứng dụng phiên nhận vé id: " + err.message);
    }
}

function SessionAppStart() {
    try {
        if (typeof (Storage) !== "undefined") {
            // Store
            sessionStorage.setItem("checkLastTicket", true);
            console.log("khởi động lại ứng dụng phiên: Phiên khởi động lại");
        } else {
            console.log("khởi động lại ứng dụng phiên: Xin lỗi, trình duyệt của bạn không hỗ trợ Web Storage...");
        }
    } catch (err) {
        console.log("ứng dụng phiên nhận vé id: " + err.message);
    }
}