function redirectToDesc() {
    console.log(this);
    location.href = `/product/${this.getAttribute("data-Id")}`;
}
function deleteItem() {
    const btn = this;
    const prodId = btn.parentNode.querySelector("[name='prodId']").value;
    const csrfToken = btn.parentNode.querySelector('[name="_csrf"]').value;
    fetch(`/delete/${prodId}`,{
        method:"DELETE",
        headers:{
            "csrf-token":csrfToken
        }
    })
    .then((result) => {
        return result.json();
    })
    .then((data) => {
        btn.parentNode.remove();
        console.log(data);
    })
    .catch((err) => {
        console.log(err);
    })
} 

window.onload = () => {
    let deleteProd = document.getElementsByClassName("deleteBtn");
    for (let i = 0; i < deleteProd.length; i++) {
        const element = deleteProd[i];
        element.addEventListener("click",deleteItem);
    }
    let displayProd = document.getElementsByClassName("displayProd");
    console.log(displayProd);
    for (let i = 0; i < displayProd.length; i++) {
        const element = displayProd[i];
        element.addEventListener("click",redirectToDesc);
    }
}