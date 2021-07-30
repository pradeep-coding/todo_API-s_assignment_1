const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
const { format } = require("date-fns");
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let database = null;

const initializeServerAndDb = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000);
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeServerAndDb();

const convertToResponseDb = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    category: dbObject.category,
    priority: dbObject.priority,
    status: dbObject.status,
    dueDate: dbObject.due_date,
  };
};

const hasPriorityPropertyAndStatusProperty = (queryParam) => {
  return queryParam.status !== undefined && queryParam.priority !== undefined;
};

const hasPriorityProperty = (queryParam) => {
  return (
    queryParam.priority !== undefined &&
    queryParam.category === undefined &&
    queryParam.status === undefined
  );
};

const hasStatusProperty = (queryParam) => {
  return (
    queryParam.status !== undefined &&
    queryParam.category === undefined &&
    queryParam.priority === undefined
  );
};

const hasSearchQProperty = (queryParam) => {
  return queryParam.search_q !== undefined;
};

const hasCategoryAndStatusProperty = (queryParam) => {
  return queryParam.category !== undefined && queryParam.status !== undefined;
};

const hasCategoryProperty = (queryParam) => {
  return (
    queryParam.category !== undefined &&
    queryParam.priority === undefined &&
    queryParam.status === undefined
  );
};

const hasCategoryAndPriorityProperty = (queryParam) => {
  return queryParam.category !== undefined && queryParam.priority !== undefined;
};

const checkGetRequestsAndVerify = (request, response, next) => {
  const { priority, status, category } = request.query;
  if (hasStatusProperty(request.query)) {
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else if (hasPriorityProperty(request.query)) {
    if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else if (hasPriorityPropertyAndStatusProperty(request.query)) {
    if (
      (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") &&
      (status === "TO DO" || status === "IN PROGRESS" || status === "DONE")
    ) {
      next();
    } else {
      if (
        !(priority === "HIGH" || priority === "MEDIUM" || priority === "LOW")
      ) {
        response.status(400);
        response.send("Invalid Todo Priority");
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
    }
  } else if (hasSearchQProperty(request.query)) {
    next();
  } else if (hasCategoryAndStatusProperty(request.query)) {
    if (
      (category === "HOME" || category === "WORK" || category === "LEARNING") &&
      (status === "TO DO" || status === "IN PROGRESS" || status === "DONE")
    ) {
      next();
    } else {
      if (
        !(category === "HOME" || category === "WORK" || category === "LEARNING")
      ) {
        response.status(400);
        response.send("Invalid Todo Category");
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
    }
  } else if (hasCategoryProperty(request.query)) {
    if (category === "HOME" || category === "WORK" || category === "LEARNING") {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  } else if (hasCategoryAndPriorityProperty(request.query)) {
    if (
      (category === "HOME" || category === "WORK" || category === "LEARNING") &&
      (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW")
    ) {
      next();
    } else {
      if (
        !(category === "HOME" || category === "WORK" || category === "LEARNING")
      ) {
        response.status(400);
        response.send("Invalid Todo Category");
      } else if (
        !(priority === "HIGH" || priority === "MEDIUM" || priority === "LOW")
      ) {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
    }
  }
};

const checkPutRequestAndVerify = (request, response, next) => {
  const { priority, category, status, todo, dueDate } = request.body;
  if (priority !== undefined) {
    if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else if (category !== undefined) {
    if (category === "HOME" || category === "WORK" || category === "LEARNING") {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  } else if (status !== undefined) {
    if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
      next();
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else if (todo !== undefined) {
    next();
  } else if (dueDate !== undefined) {
    next();
  }
};

app.get("/todos/", checkGetRequestsAndVerify, async (request, response) => {
  let getTodoQuery = null;
  let data = null;
  const { search_q = "", priority, status, category } = request.query;
  switch (true) {
    case hasStatusProperty(request.query):
      getTodoQuery = `SELECT *
                    FROM todo
                    WHERE status = '${status}';`;
      break;
    case hasPriorityProperty(request.query):
      getTodoQuery = `SELECT *
                            FROM todo
                            WHERE priority = '${priority}';`;
      break;
    case hasPriorityPropertyAndStatusProperty(request.query):
      getTodoQuery = `SELECT *
                                FROM todo
                                WHERE status = '${status}'
                                AND priority = '${priority}';`;
      break;
    case hasSearchQProperty(request.query):
      getTodoQuery = `SELECT *
                        FROM todo
                        WHERE todo LIKE '%${search_q}%'`;
      break;
    case hasCategoryAndStatusProperty(request.query):
      getTodoQuery = `SELECT *
                                FROM todo
                                WHERE status = '${status}'
                                AND category = '${category}';`;
      break;
    case hasCategoryProperty(request.query):
      getTodoQuery = `SELECT *
                            FROM todo
                            WHERE category = '${category}';`;
      break;
    case hasCategoryAndPriorityProperty(request.query):
      getTodoQuery = `SELECT *
                                FROM todo
                                WHERE priority = '${priority}'
                                AND category = '${category}';`;
      break;
  }
  data = await database.all(getTodoQuery);
  response.send(data.map((eachData) => convertToResponseDb(eachData)));
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT *
                            FROM todo
                            WHERE id = ${todoId};`;
  const data = await database.get(getTodoQuery);
  response.send(convertToResponseDb(data));
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;

  try {
    const newDate = format(new Date(date), "yyyy-MM-dd");
    const getTodoQuery = `SELECT *
                            FROM todo
                            WHERE due_date = '${newDate}';`;
    const data = await database.all(getTodoQuery);
    response.send(data.map((eachData) => convertToResponseDb(eachData)));
  } catch {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, category, status, dueDate } = request.body;
  switch (true) {
    case priority !== undefined:
      if (
        !(priority === "HIGH" || priority === "MEDIUM" || priority === "LOW")
      ) {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
    case category !== undefined:
      if (
        !(category === "HOME" || category === "WORK" || category === "LEARNING")
      ) {
        response.status(400);
        response.send("Invalid Todo Category");
      }
    case status !== undefined:
      if (
        !(status === "TO DO" || status === "IN PROGRESS" || status === "DONE")
      ) {
        response.status(400);
        response.send("Invalid Todo Status");
      }

    case dueDate !== undefined:
      try {
        const newDate = format(new Date(dueDate), "yyyy-MM-dd");
        updateStatus = "Due Date";
      } catch {
        response.status(400);
        response.send("Invalid Due Date");
      }

      break;
  }
  const insertTodoQuery = `INSERT INTO todo
                                (id,todo, category, priority, status, due_date)
                            VALUES (${id}, '${todo}', '${category}', '${priority}', '${status}', '${dueDate}');`;
  await database.run(insertTodoQuery);
  response.send("Todo Successfully Added");
});

app.put(
  "/todos/:todoId/",
  checkPutRequestAndVerify,
  async (request, response) => {
    const { todoId } = request.params;
    let updateStatus = "";
    const requestBody = request.body;
    switch (true) {
      case requestBody.status !== undefined:
        updateStatus = "Status";
        break;
      case requestBody.priority !== undefined:
        updateStatus = "Priority";
        break;
      case requestBody.todo !== undefined:
        updateStatus = "Todo";
        break;
      case requestBody.category !== undefined:
        updateStatus = "Category";
        break;
      case requestBody.dueDate !== undefined:
        try {
          const newDate = format(new Date(requestBody.dueDate), "yyyy-MM-dd");
          updateStatus = "Due Date";
        } catch {
          response.status(400);
          response.send("Invalid Due Date");
        }
        break;
    }
    const previousTodo = `SELECT *
                        FROM todo
                        WHERE id = ${todoId}`;
    const previousTodoItem = await database.get(previousTodo);

    const {
      todo = previousTodoItem.todo,
      priority = previousTodoItem.priority,
      status = previousTodoItem.status,
      category = previousTodoItem.category,
      id = previousTodoItem.id,
      dueDate = previousTodoItem.due_date,
    } = request.body;
    const updateTodoQuery = `UPDATE todo
                        SET id = ${id},
                            todo = '${todo}',
                            priority = '${priority}',
                            status = '${status}',
                            category = '${category}',
                            due_date = '${dueDate}'

                        WHERE id = ${todoId};`;
    await database.run(updateTodoQuery);
    response.send(`${updateStatus} Updated`);
  }
);

app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `DELETE FROM todo
                                WHERE id = ${todoId};`;
  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
