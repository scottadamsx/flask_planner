

let slots = document.querySelectorAll("td")

const messageBox = document.getElementById("messageBox")

messageBox.textContent = "x's Turn!"

let player = "x"

function switchPlayer(player) {
    if (player == "x"){
        player = "o"
    } else {
        player = "x"
    }
    return player
}
console.log(slots)

function addPlayAgainBtn() {
    const playAgainBtn = document.createElement("button")
    playAgainBtn.textContent = "Play Again"
    playAgainBtn.addEventListener("click", () => {
        window.location.reload()
    })
    document.getElementById("playAgain").appendChild(playAgainBtn)
}

slots.forEach(slot => {
    slot.addEventListener("click", evt => {
        if (slot.textContent == "") {
            if (player == "x") {
                slot.style.color = "blue"
            } else {
                slot.style.color = "orange"
            }
            slot.textContent = player
            
            win = checkForWin(slots, player)
            if (win == true) {
                messageBox.textContent = `${player} has won the game!`
                addPlayAgainBtn()
                removeClick(slots, player)
            } 
            else  if (win == "stalemate") {
                messageBox.textContent = `Stalemate... better luck next time!`
                addPlayAgainBtn()
                removeClick(slots, player)
            } 
            else {
                player = switchPlayer(player)
            messageBox.textContent = `${player}'s turn!`
            }
            
        } else {
            alert("space is taken")
        }
    })
})

function removeClick(slots, player) {
    slots.forEach(slot => {
       slot.style.pointerEvents = "none"
    })
}

function checkForWin(slots, player) {
    let win = false
    console.log(slots[0].textContent, slots[1].textContent, slots[2].textContent)
    // if top row matches
    if (slots[0].textContent == slots[1].textContent && slots[1].textContent == slots[2].textContent && slots[0].textContent != "") {
        win = true
    }
   // if middle row matches
    else if (slots[3].textContent == slots[4].textContent && slots[4].textContent == slots[5].textContent && slots[5].textContent != "") {
         // players wins
        win = true
    }
    // if bottom matches
    else if (slots[6].textContent == slots[7].textContent && slots[7].textContent == slots[8].textContent && slots[8].textContent != "") {
         // players wins
        win = true
    }
    // if left column matches
    else if (slots[0].textContent == slots[3].textContent && slots[3].textContent == slots[6].textContent && slots[6].textContent != "") {
         // players wins
        win = true
    }
    // if middle column matches
    else if (slots[1].textContent == slots[4].textContent && slots[4].textContent == slots[7].textContent && slots[7].textContent != "") {
         // players wins
        win = true
    }
     // if right column matches
    else if (slots[2].textContent == slots[5].textContent && slots[5].textContent == slots[8].textContent && slots[8].textContent != "") {
         // players wins
        win = true
    }
    // if slash matches
    else if (slots[0].textContent == slots[4].textContent && slots[4].textContent == slots[8].textContent && slots[4].textContent != "") {
         // players wins
        win = true
    }
    // if backslash matches
    else if (slots[6].textContent == slots[4].textContent && slots[4].textContent == slots[2].textContent && slots[4].textContent != "") {
         // players wins
        win = true   
    } 
    else if (slots[0].textContent != "" && slots[1].textContent != "" && slots[2].textContent != "" 
            && slots[3].textContent != "" && slots[4].textContent != "" && slots[5].textContent != "" 
            && slots[6].textContent != "" && slots[7].textContent != "" && slots[8].textContent != "" ) {
        win = "stalemate"
    }
    else {
        console.log(win)
    }
    return win
    // else keep playing
}



