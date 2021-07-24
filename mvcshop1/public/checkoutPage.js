let checkoutBtn = document.getElementById("payment");
let stripe = Stripe(checkoutBtn.getAttribute("data-api"));
checkoutBtn.addEventListener("click", () => {
    stripe.redirectToCheckout({
        sessionId: checkoutBtn.getAttribute("data-session")
    });
})