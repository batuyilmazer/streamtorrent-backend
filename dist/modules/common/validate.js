function makeHandler(schema, getData, setData) {
    return (req, res, next) => {
        const parsed = schema.safeParse(getData(req));
        if (!parsed.success) {
            return res
                .status(400)
                .json({ error: "validation_error", details: parsed.error.issues });
        }
        setData(req, parsed.data);
        next();
    };
}
export function validateBody(schema) {
    return makeHandler(schema, (req) => req.body, (req, data) => {
        req.body = data;
    });
}
export function validateQuery(schema) {
    return makeHandler(schema, (req) => req.query, (req, data) => {
        req.validatedQuery = data;
    });
}
export function validateParams(schema) {
    return makeHandler(schema, (req) => req.params, (req, data) => {
        req.params = data;
    });
}
//# sourceMappingURL=validate.js.map