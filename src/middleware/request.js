function leerBodyJSON(req) {
  return new Promise((resolve, reject) => {
    let cuerpoTexto = '';

    req.on('data', (pedazo) => {
      cuerpoTexto += pedazo.toString();
    });

    req.on('end', () => {
      if (!cuerpoTexto) {
        resolve({});
        return;
      }
      try {
        const datos = JSON.parse(cuerpoTexto);
        resolve(datos);
      } catch (error) {
        reject(new Error('El formato enviado no es un JSON válido'));
      }
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

function responderJSON(res, codigoHTTP, objetoDatos) {
  res.writeHead(codigoHTTP, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(objetoDatos));
}

module.exports = {
  leerBodyJSON,
  responderJSON
};
