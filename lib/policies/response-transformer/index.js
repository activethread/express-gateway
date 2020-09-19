const transformObject = require('../request-transformer/transform-object');

module.exports = {
  schema: {
    ...require('../request-transformer/schema'),
    $id: 'http://express-gateway.io/schemas/policies/response-transformer.json'
  },
  policy: params => {
    return (req, res, next) => {
      if (params.body) {
        const _write = res.write;
        res.write = (data) => {
          try {
            if (Buffer.isBuffer(data)) {
              let value = Buffer.from(Buffer.from(data).toJSON().data).toString();
              const remove = (name) => {
                const token = `"${name}":"`;
                const parts = value.split(token);
                if (parts.length > 1) {
                  const properties = parts[1].split(',');
                  properties.shift();
                  value = parts[0] + properties.join(',');
                }
              };
              if (params.body.remove) {
                params.body.remove.forEach((item) => {
                  remove(item);
                });
              }
              _write.call(res, Buffer.from(value));
              return;
            }
            const body = transformObject(params.body, req.egContext, JSON.parse(data));
            const bodyData = JSON.stringify(body);

            res.setHeader('Content-Length', Buffer.byteLength(bodyData));
            _write.call(res, bodyData);
          } catch (e) {
            // console.error(e);
            _write.call(res, data);
          }
        };
      }

      if (params.headers) {
        const _writeHead = res.writeHead;

        res.writeHead = (statusCode, statusMessage, headers) => {
          res._headers = transformObject(params.headers, req.egContext, res.getHeaders());
          return _writeHead.call(res, statusCode, statusMessage, headers);
        };
      }
      next();
    };
  }
};