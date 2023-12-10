import express from 'express';
import got from 'got';
const app = express();

app.set('port', 4000);
app.use(express.json());

app.use(function (req, res, next) { // Middleware para permitir consumo de APIS localmente.
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

/** Servicio para obtener todos los productos relacionados con una búsqueda específica  */
app.get('/api/items', (req, res) => {
    const query = req.query.q; // Obtenemos el parámetro de la petición.
    (async () => {
        try {
            const externalAPI = await got(`https://api.mercadolibre.com/sites/MLA/search?q=${query}`); // Consumimos el endpoint en el API de Meli con el parámetro solicitado.
            const body = JSON.parse(externalAPI.body); // Obtenemos la respuesta del servicio.
            let bodyAux = { // Construimos el array deseado con la información obtenida del API.
                author: {
                    name: 'Julio',
                    lastname: 'Arroyave'
                }
            };
            let categories = [];
            if (body.filters.length !== 0) {
                categories = [...getValues(body.filters)];
            } else {
                categories = [...getValues(body.available_filters)];
            }
            let items = [];
            body.results.forEach(item => {
                items.push({
                    id: item.id,
                    title: item.title,
                    price: {
                        currency: item.currency_id,
                        amount: item.price,
                        decimals: countDecimals(item.price),
                    },
                    picture: item.thumbnail,
                    condition: item.condition,
                    free_shipping: item.shipping.free_shipping,
                });
            });
            bodyAux.categories = [...categories];
            bodyAux.items = [...items];
            res.send(bodyAux); // Enviamos la respuesta de nuestro servicio al cliente después de que el body este armado.
         } catch (error) {
            let customError = {
                message: JSON.parse(error.response.body).error
            }
            res.status(error.response.statusCode).send(customError); // Envío de error en caso de presentar inconvenientes.
         }
    })();
});

/** Servicio para obtener la información específica de un item por su ID */
app.get('/api/items/:id', (req, res) => {
    const id = req.params.id; // Obtenemos el parámetro id que nos envía el cliente.
    (async () => {
        try {
            const extItemAPI = await got(`https://api.mercadolibre.com/items/${id}`); // Consumimos el endpoint de Meli para obtener información del producto.
            const extItemDescrAPI = await got(`https://api.mercadolibre.com/items/${id}/description`); // Consumimos el endpoint de Meli para obtener la descripción del item específico.
            const bodyItem = JSON.parse(extItemAPI.body); // Obtenemos la respuesta del API de información del producto.
            const bodyItemDescr = JSON.parse(extItemDescrAPI.body); // Obtenemos la respuesta del API de descripción del producto.
            let bodyAux = { // Construimos el body con el formato específico.
                author: {
                    name: 'Julio',
                    lastname: 'Arroyave'
                },
                item: {
                    id: bodyItem.id,
                    title: bodyItem.title,
                    price: {
                        currency: bodyItem.currency_id,
                        amount: bodyItem.price,
                        decimals: countDecimals(bodyItem.price),
                    },
                    picture: bodyItem.pictures[0].url,
                    condition: bodyItem.condition,
                    free_shipping: bodyItem.shipping.free_shipping,
                    sold_quantity: bodyItem.sold_quantity,
                    description: bodyItemDescr.plain_text,
                    initial_quantity: bodyItem.initial_quantity,
                }
            };
            res.send(bodyAux); // Enviamos la respuesta de nuestro servicio al Cliente.
        } catch (error) {
            let customError = {
                message: JSON.parse(error.response.body).error
            }
            res.status(error.response.statusCode).send(customError); // Enviamos el error en caso de presentar inconvenientes.
        }
    })();
});

var getValues = function (array) {
    const findItem = array?.find((item) => item.id === 'category');
    const aux = [];
    if (findItem) {
        findItem.values.forEach((value) => {
            if (value.path_from_root) {
                value.path_from_root.forEach((path) => {
                    aux.push(path.name);
                })
            } else {
                aux.push(value.name);
            }
            
        });
    }
    return aux;
}

/** Funcionalidad para contar el número de decimales de un valor */
var countDecimals = function (value) {
    if(Math.floor(value) === value) return 0;
    return value.toString().split('.')[1].length || 0;
}

/** Listen para ejecución del servidor  */
app.listen(app.get('port'), () => {
    console.log(`Server on port ${app.get('port')}`);
});