const env = "SANDBOX"

const prod_api_key = "pk-gEKuO5fHV3GIUQb0hTh7YChBCMJOgDLRKbw96umP14X"
const prod_secret_key = "sk-X8qolYjy62kIzEbr0QRK1h4b4KDVHaNcwMYk39jInSl"

// const sandbox_api_key = "pk-pvlwGPQflkjv1J8qZEyUVYW74EPgUf8YQxPgkGl9l9n:"
const sandbox_api_key = "pk-Z0OSzLvIcOI2UIvDhdTGVVfRSSeiGStnceqwUE7n0Ah:"
const sandbox_secret_key = "sk-X8qolYjy62kIzEbr0QRK1h4b4KDVHaNcwMYk39jInSl:"

const api_url = "https://pg-sandbox.paymaya.com"

//PUBLIC TOKENS
let b64 = env == "PRODUCTION" ? Base64.btoa(prod_api_key) : Base64.btoa(sandbox_api_key)
let token = "Basic " + b64.substr(0, b64.length-1) + "="

//SECRET TOKENS
let sb64 = env == "PRODUCTION" ? Base64.btoa(sandbox_secret_key) : Base64.btoa(sandbox_secret_key)
let stoken = "Basic " + sb64.substr(0, sb64.length-1) + "="


const Service = async (url, method, headers, data) => {
    return fetch(url, {
        method: method,
        body: JSON.stringify(data),
        headers: headers.isSecret ? {
            'Content-Type': 'application/json',
            'Authorization': stoken
        } : {
            'Content-Type': 'application/json',
            'Authorization': token
        }
      })
    .then((response) => response.json())
    .then((json) => {
      return json;
    })
    .catch((error) => {
      return error
    });
}

const CreateCustomer = async (data) => {
    let result = await Service(`${api_url}/payments/v1/customers`, "POST", {isSecret: true}, data)
    return result
}

const CreateCardToken = async (data) => {
    let result = await Service(`${api_url}/payments/v1/payment-tokens`, "POST", {isSecret: false}, data)
    return result
}

const GetCustomerDetails = () => {
    let url = api_url + `/payments/v1/customers/CUSTOMER_ID`
}

const GetCustomerCards = () => {
    //GET
    let url = api_url + `/payments/v1/customers/CUSTOMER_ID/cards`
}

const PerformLink = async (customerId, token) => {
    let result = await Service(`${api_url}/payments/v1/customers/${customerId}/cards`, "POST", {isSecret: true}, {
        paymentTokenId: token, isDefault: true, redirectUrl: {success: '', failure: '', cancel: ''}
    })
    return result
}

const Register = async (client) => {
    let newCustomer = await CreateCustomer(client)
    let newCardToken = await CreateCardToken(client.card)
    
    console.log("CUSTOMER CREATION", newCustomer);
    console.log("CARD TOKEN CREATION", newCardToken);

    if(newCardToken.state == "AVAILABLE"){
        let newRegisteredCustomer = await PerformLink(newCustomer.id, newCardToken.paymentTokenId)
        console.log("LINK RESULT", newRegisteredCustomer)
        if(newRegisteredCustomer) return {
            customer: newCustomer,
            card: newCardToken,
            link: newRegisteredCustomer
        }
        else return false
    }
}

const SAVETODATABASE = async (id, token, fulldata) => {
    try{
        await AsyncStorage.setItem("CustomerId", id)
        await AsyncStorage.setItem("PaymentTokenId", token)
        await AsyncStorage.setItem("CustomerDetails", JSON.stringify(fulldata))
        return true
    }catch(err){
        console.error(err)
        return false
    }
}


const Payout = async (customerId, token, amount) => {
    let result = await Service(`${api_url}/payments/v1/customers/${customerId}/cards/${token}/payments`, "POST", {isSecret: true}, {
        totalAmount: {amount: amount, currency: "PHP"}
    })
    return result
}

const CheckOut = async (customerId, paymentToken, clientDetails) => {
    
    //CHECK IF CLIENT HAS CUSTOMER DATA
    if(customerId && paymentToken){

    }else{
        //IF NOT, REGISTER THE CLIENT
        let newCustomer = await Register(clientDetails)
        if(newCustomer){
            //IF SUCCESSFULLY REGISTERED

            //MUST SAVE DETAILS TO DATABASE
            let state = await SAVETODATABASE(newCustomer.customer.id, newCustomer.card.paymentTokenId, newCustomer)
            if(state){
                //AFTER SAVING, PROCEED TO PAYOUT
                let payout = await Payout(newCustomer.customer.id, newCustomer.card.paymentTokenId, 10)
                return payout
            }

        }else{
            return false;
        }
    }

}

export default {
    initCheckOut: CheckOut,
    initPayOut: Payout
}
