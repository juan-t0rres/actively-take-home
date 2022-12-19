import pandas as pd
import random
from flask import jsonify
from typing import Dict, List
from sklearn import ensemble, linear_model, neural_network

# Gets a field from the request
def get_field(field_name, request):
    request_json = request.get_json(silent=True)
    request_args = request.args
    if request_json and field_name in request_json:
        return request_json[field_name]
    elif request_args and field_name in request_args:
        return request_args[field_name]
    return None

# Sanitizes data to drop NaN values and cast inputs as numbers and outputs as booleans
def sanitize_dataframe(df, inputs, outputs):
    df_copy = df.copy()
    for input in inputs:
        df_copy[input] = pd.to_numeric(df_copy[input])
    for output in outputs:
        df_copy[output] = df_copy[output].map(
            {'True': True, 'TRUE': True, 'true': True, 'False': False, 'FALSE': False, 'false': False})
        df_copy[output] = df_copy[output].astype(bool)
    df_copy = df_copy.dropna()
    return df_copy

MODEL_TYPES = [
    linear_model.LogisticRegression,
    neural_network.MLPClassifier,
    ensemble.RandomForestClassifier,
]

# From notion description, no changes made
def train_model_and_make_prediction(
    dataset: pd.DataFrame,
    output: str,
    inputs: List[str],
    hypothetical_input: Dict[str, float],
) -> float:  # probability of output being `True` for hypothetical input
    assert dataset[output].dtype in (bool,)
    assert all(dataset[input].dtype in (float, int) for input in inputs)

    X = dataset[inputs]
    y = dataset[output]

    model = random.choice(MODEL_TYPES)()
    model.fit(X, y)

    return model.predict_proba(
        pd.DataFrame({input: [hypothetical_input[input]] for input in inputs})
    )[0, model.classes_.tolist().index(True)]

# HTTP endpoint entry
def get_prediction(request):
    # CORS configuration
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)
    headers = {
        'Access-Control-Allow-Origin': '*'
    }

    # Get input from client
    data = get_field('data', request)
    inputs = get_field('inputs', request)
    outputs = get_field('outputs', request)
    output = get_field('output', request)
    hypothetical_input = get_field('hypInput', request)
    for input in inputs:
        hypothetical_input[input] = float(hypothetical_input[input])

    # Load into dataframe and sanitize data
    df = pd.DataFrame(data)
    df = sanitize_dataframe(df, inputs, outputs)

    # Make prediction
    prediction = train_model_and_make_prediction(df, output, inputs, hypothetical_input)

    # Return prediction to client
    response = {
        "data": prediction
    }
    return (jsonify(response), 200, headers)
