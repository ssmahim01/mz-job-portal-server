/* 
* -----------------
* ------JWT--------
* -----------------

* Install jsonwebtoken & cookie-parser
* Set cookieParser as middleware
* 1.Create a token
* jwt.sign(data, secret, {expiresIn: '5h'})
* Set token to the cookie of res.cookie('token', token, {
*   httpOnly: true,
*   secure: false
* }).send({})
*
* cors({
* origin: ['http://localhost:example'],
* credentials: true
* })
*
* client: {
* withCredentials: true
* }
*
* 2.Send token to the client side. make sure token is in the cookies(application).

*/