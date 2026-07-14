(function () {
  "use strict";

  var manifest = window.GLNBENCH_MANIFEST;
  if (!manifest) return;
  var $ = function (id) { return document.getElementById(id); };
  var ids = ["dataset", "noiseType", "noiseRate", "dataRoot", "normalize", "backbone", "innerGnn", "method", "hidden", "layers", "dropout", "normalization", "jk", "selfLoop", "residual", "device", "mode", "lr", "weightDecay", "epochs", "patience", "runs", "seed", "batchSize", "sampler", "rateSweep", "methodParams"];
  var methodValues = {};

  function fill(select, values) {
    select.innerHTML = "";
    values.forEach(function (item) {
      var option = document.createElement("option");
      option.value = typeof item === "string" ? item : item.id;
      option.textContent = typeof item === "string" ? item : item.label;
      select.appendChild(option);
    });
  }

  fill($("dataset"), manifest.datasets);
  fill($("noiseType"), manifest.noise_types);
  fill($("backbone"), manifest.backbones);
  var modifiedBackbone = manifest.backbones.find(function (item) { return item.id === "gcn_modified"; });
  fill($("innerGnn"), modifiedBackbone && modifiedBackbone.variants ? modifiedBackbone.variants : []);
  fill($("method"), manifest.methods);
  fill($("normalization"), manifest.normalizations);
  fill($("jk"), manifest.jumping_knowledge);
  fill($("device"), manifest.devices);
  fill($("mode"), manifest.modes);
  fill($("sampler"), manifest.samplers);
  $("schemaVersion").textContent = manifest.schema_version;

  var presets = {
    quick: {dataset:"cora",noiseType:"uniform",noiseRate:0.2,normalize:true,backbone:"gcn",innerGnn:"gcn",method:"standard",hidden:16,layers:2,dropout:0.2,normalization:"layer",jk:"none",selfLoop:true,residual:false,device:"cpu",mode:"transductive",lr:0.01,weightDecay:0.0005,epochs:200,patience:20,runs:1,seed:42,batchSize:"",sampler:"neighbor",rateSweep:"",methodParams:""},
    research: {dataset:"cora",noiseType:"uniform",noiseRate:0.4,normalize:true,backbone:"gcn",innerGnn:"gcn",method:"gcod",hidden:64,layers:2,dropout:0.5,normalization:"layer",jk:"none",selfLoop:true,residual:false,device:"cuda",mode:"transductive",lr:0.01,weightDecay:0.0005,epochs:500,patience:50,runs:5,seed:42,batchSize:"",sampler:"neighbor",rateSweep:"0.2, 0.4",methodParams:""},
    large: {dataset:"web-topics",noiseType:"uniform",noiseRate:0.2,normalize:true,backbone:"gcn",innerGnn:"gcn",method:"standard",hidden:64,layers:2,dropout:0.5,normalization:"layer",jk:"none",selfLoop:true,residual:false,device:"cuda",mode:"transductive",lr:0.01,weightDecay:0.0005,epochs:300,patience:30,runs:3,seed:42,batchSize:1024,sampler:"neighbor",rateSweep:"",methodParams:""}
  };

  function setValue(id, value) {
    var el = $(id);
    if (el.type === "checkbox") el.checked = Boolean(value);
    else el.value = value;
  }

  function applyPreset(name) {
    Object.keys(presets[name]).forEach(function (key) { setValue(key, presets[name][key]); });
    setValue("dataRoot", "data");
    methodValues = {};
    renderMethodParameters(true);
    document.querySelectorAll(".preset").forEach(function (button) { button.classList.toggle("active", button.dataset.preset === name); });
    update();
  }

  function selectedMethod() {
    return manifest.methods.find(function (item) { return item.id === $("method").value; });
  }

  function defaultMethodValues(method) {
    var values = {};
    Object.keys(method.parameters || {}).forEach(function (name) {
      values[name] = method.parameters[name].default;
    });
    return values;
  }

  function renderMethodParameters(reset) {
    var method = selectedMethod();
    var fields = $("methodParameterFields");
    fields.innerHTML = "";
    if (!method) return;
    if (reset) {
      methodValues[method.id] = defaultMethodValues(method);
    } else {
      methodValues[method.id] = Object.assign(
        defaultMethodValues(method),
        methodValues[method.id] || {}
      );
    }

    $("methodParametersTitle").textContent = method.label + " hyperparameters";
    var names = Object.keys(method.parameters || {});
    $("emptyMethodParameters").hidden = names.length > 0;
    $("resetMethodParams").hidden = names.length === 0;

    names.forEach(function (name) {
      var specification = method.parameters[name];
      var label = document.createElement("label");
      label.appendChild(document.createTextNode(name));
      var help = document.createElement("small");
      help.textContent = specification.description;
      label.appendChild(help);

      var input;
      if (specification.type === "boolean" || specification.type === "enum") {
        input = document.createElement("select");
        var options = specification.type === "boolean" ? [true, false] : specification.options;
        options.forEach(function (value) {
          var option = document.createElement("option");
          option.value = String(value);
          option.textContent = String(value);
          input.appendChild(option);
        });
      } else {
        input = document.createElement("input");
        input.type = specification.type === "string" ? "text" : "number";
        if (Object.prototype.hasOwnProperty.call(specification, "min")) input.min = specification.min;
        if (Object.prototype.hasOwnProperty.call(specification, "max")) input.max = specification.max;
        input.step = specification.step || (specification.type.indexOf("integer") >= 0 ? 1 : "any");
        if (specification.type.indexOf("nullable_") === 0) input.placeholder = "automatic (null)";
      }
      input.dataset.parameter = name;
      input.dataset.parameterType = specification.type;
      var current = methodValues[method.id][name];
      input.value = current === null ? "" : String(current);
      input.addEventListener("input", update);
      input.addEventListener("change", update);
      label.appendChild(input);
      fields.appendChild(label);
    });
  }

  function collectMethodParameters() {
    var method = selectedMethod();
    if (!method) return {};
    var values = {};
    $("methodParameterFields").querySelectorAll("[data-parameter]").forEach(function (input) {
      var name = input.dataset.parameter;
      var specification = method.parameters[name];
      var raw = input.value.trim();
      var value;
      if (specification.type.indexOf("nullable_") === 0 && raw === "") {
        value = null;
      } else if (specification.type === "boolean") {
        value = raw === "true";
      } else if (specification.type === "integer" || specification.type === "nullable_integer") {
        value = Number(raw);
        if (!Number.isInteger(value)) throw new Error(name + " must be an integer.");
      } else if (specification.type === "number" || specification.type === "nullable_number") {
        value = Number(raw);
        if (!Number.isFinite(value)) throw new Error(name + " must be a number.");
      } else {
        value = raw;
      }
      if (value !== null && specification.min !== undefined && value < specification.min) throw new Error(name + " must be at least " + specification.min + ".");
      if (value !== null && specification.max !== undefined && value > specification.max) throw new Error(name + " must be at most " + specification.max + ".");
      values[name] = value;
    });
    methodValues[method.id] = values;
    return values;
  }

  function number(id) { return Number($(id).value); }
  function cleanText(value) { return value.trim().replace(/[\r\n\t]/g, " "); }
  function sweepRates() {
    var raw = $("rateSweep").value.trim();
    if (!raw) return [];
    return raw.split(",").map(function (value) { return Number(value.trim()); });
  }

  function methodParams() {
    var raw = $("methodParams").value.trim();
    if (!raw) return {};
    var parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("Method parameters must be a JSON object.");
    return parsed;
  }

  function quote(value) {
    if (value === null) return "null";
    if (typeof value === "boolean") return String(value);
    if (typeof value === "number") {
      var numeric = String(value);
      if (/^-?\d+e[+-]?\d+$/i.test(numeric)) numeric = numeric.replace(/e/i, ".0e");
      return numeric;
    }
    var string = String(value);
    if (/^[a-zA-Z0-9_./-]+$/.test(string)) return string;
    return JSON.stringify(string);
  }

  function yamlLines(value, indent) {
    var pad = " ".repeat(indent || 0), lines = [];
    Object.keys(value).forEach(function (key) {
      var item = value[key];
      if (item && typeof item === "object" && !Array.isArray(item)) {
        lines.push(pad + key + ":");
        lines = lines.concat(yamlLines(item, (indent || 0) + 2));
      } else if (Array.isArray(item)) {
        lines.push(pad + key + ": [" + item.map(quote).join(", ") + "]");
      } else {
        lines.push(pad + key + ": " + quote(item));
      }
    });
    return lines;
  }

  function buildConfig() {
    var rates = sweepRates();
    var noiseRate = rates.length ? "£[" + rates.join(", ") + "]" : number("noiseRate");
    var config = {
      seed: number("seed"),
      device: $("device").value,
      num_runs: number("runs"),
      dataset: {name: $("dataset").value, root: cleanText($("dataRoot").value) || "data", normalize: $("normalize").checked},
      noise: {type: $("noiseType").value, rate: noiseRate, seed: number("seed")},
      model: {name: $("backbone").value, hidden_channels: number("hidden"), n_layers: number("layers"), dropout: number("dropout"), self_loop: $("selfLoop").checked, use_residual: $("residual").checked, jk: $("jk").value, normalization: $("normalization").value},
      training: {method: $("method").value, lr: number("lr"), weight_decay: number("weightDecay"), epochs: number("epochs"), patience: number("patience"), early_stopping_metric: "val_acc", oversmoothing_every: 20, mode: $("mode").value}
    };
    if (config.model.name === "gcn_modified") config.model.inner_gnn = $("innerGnn").value;
    if ($("batchSize").value) {
      config.training.batch_size = number("batchSize");
      config.training.sampler = $("sampler").value;
      if ($("sampler").value === "neighbor") config.training.sampler_params = {num_neighbors: [15, 10]};
    }
    var params = Object.assign({}, collectMethodParameters(), methodParams());
    if (Object.keys(params).length) config[$("method").value + "_params"] = params;
    return config;
  }

  function validate(config) {
    var errors = [], warnings = [], rates = sweepRates();
    var method = manifest.methods.find(function (item) { return item.id === config.training.method; });
    var backbone = manifest.backbones.find(function (item) { return item.id === config.model.name; });
    var effectiveBackbone = backbone;
    if (backbone && backbone.id === "gcn_modified") {
      effectiveBackbone = (backbone.variants || []).find(function (item) {
        return item.id === config.model.inner_gnn;
      }) || backbone;
    }
    var allRates = rates.length ? rates : [number("noiseRate")];
    if (allRates.some(function (rate) { return !Number.isFinite(rate) || rate < 0 || rate > 1; })) errors.push("Every noise rate must be between 0 and 1.");
    if (config.noise.type === "clean" && allRates.some(function (rate) { return rate !== 0; })) warnings.push("Clean noise ignores the selected rate; use 0 for a clearer record.");
    if (manifest.heterophilous_datasets.indexOf(config.dataset.name) >= 0 && config.dataset.normalize) warnings.push("This heterophilous dataset often performs better with feature normalization off.");
    if (manifest.heterophilous_datasets.indexOf(config.dataset.name) >= 0 && config.model.self_loop) warnings.push("Self-loops can dilute neighbor signal on heterophilous datasets.");
    if (config.training.batch_size && method && !method.batched_training) warnings.push(method.label + " trains full-graph; batching only applies to evaluation and inference.");
    if (method && method.requires_edge_weights && effectiveBackbone && !effectiveBackbone.edge_weights) warnings.push(method.label + " is ineffective with " + effectiveBackbone.label + " because this backbone variant does not consume edge weights.");
    if (method && method.large_graph_risk && manifest.large_datasets.indexOf(config.dataset.name) >= 0) warnings.push(method.label + " has a documented memory/scalability risk on large graphs.");
    if (config.training.method === "pi_gnn") {
      var params = config.pi_gnn_params || {};
      var start = params.start_epoch === undefined ? 200 : Number(params.start_epoch);
      if (config.training.epochs <= start) warnings.push("PI-GNN's MI branch will not activate unless epochs exceeds start_epoch (default 200).");
    }
    if (config.training.patience > config.training.epochs) warnings.push("Patience exceeds total epochs, so early stopping cannot trigger.");
    if (config.model.hidden_channels >= 512 && method && method.width_sensitive) warnings.push(method.label + " is documented as width-sensitive and may collapse at this hidden size.");
    if (!config.dataset.root || /[;&|`$<>]/.test(config.dataset.root)) errors.push("Data directory contains shell-control characters. Use a simple relative path.");
    return {errors: errors, warnings: warnings};
  }

  function commands(config, count) {
    var method = manifest.methods.find(function (item) { return item.id === config.training.method; });
    var robust = count > 5 || manifest.large_datasets.indexOf(config.dataset.name) >= 0 || (method && method.large_graph_risk);
    return [
      "git clone https://github.com/GLNBench/GLNBench.git",
      "cd GLNBench",
      "python3 -m venv .venv",
      "source .venv/bin/activate",
      "python3 -m pip install --upgrade pip",
      "python3 -m pip install -r requirements.txt",
      "",
      "# Save the generated YAML as config.yaml, then run:",
      robust ? "python3 run_robust.py -c config.yaml --timeout 7200" : "python3 main.py -c config.yaml"
    ].join("\n");
  }

  function stateObject() {
    var state = {};
    ids.forEach(function (id) { var el = $(id); state[id] = el.type === "checkbox" ? el.checked : el.value; });
    try { collectMethodParameters(); } catch (error) {}
    state._methodValues = methodValues;
    return state;
  }

  function restoreFromUrl() {
    var encoded = new URLSearchParams(location.search).get("config");
    if (!encoded) return false;
    try {
      var state = JSON.parse(decodeURIComponent(escape(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")))));
      ids.forEach(function (id) { if (Object.prototype.hasOwnProperty.call(state, id)) setValue(id, state[id]); });
      methodValues = state._methodValues && typeof state._methodValues === "object" ? state._methodValues : {};
      renderMethodParameters(false);
      return true;
    } catch (error) { return false; }
  }

  function shareUrl() {
    var encoded = btoa(unescape(encodeURIComponent(JSON.stringify(stateObject())))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return location.origin + location.pathname + "?config=" + encoded;
  }

  var activeTab = "yaml";
  function update() {
    var yaml = "", command = "", messages = [], invalid = false, count = 1;
    try {
      $("innerGnn").disabled = $("backbone").value !== "gcn_modified";
      var config = buildConfig();
      var result = validate(config);
      invalid = result.errors.length > 0;
      messages = result.errors.concat(result.warnings);
      count = Math.max(sweepRates().length, 1);
      yaml = "# Generated by https://glnbench.github.io/website/builder.html\n" + yamlLines(config, 0).join("\n") + "\n";
      command = commands(config, count);
    } catch (error) {
      invalid = true;
      messages = [error.message];
      yaml = "# Fix the configuration error shown above to generate YAML.\n";
      command = "# Commands will appear when the configuration is valid.\n";
    }
    $("yamlOutput").textContent = yaml;
    $("commandOutput").textContent = command;
    $("experimentCount").textContent = count;
    $("runCount").textContent = $("runs").value || "0";
    $("messages").innerHTML = "";
    messages.forEach(function (message) { var li = document.createElement("li"); li.textContent = message; $("messages").appendChild(li); });
    $("statusDot").className = "status-dot" + (invalid ? " bad" : messages.length ? " warn" : "");
    $("statusText").textContent = invalid ? "Configuration needs attention" : messages.length ? "Runnable with warnings" : "Configuration ready";
    $("copyOutput").disabled = invalid;
    $("downloadYaml").disabled = invalid;
    $("copyLink").disabled = invalid;
    $("copyOutput").textContent = activeTab === "yaml" ? "Copy YAML" : "Copy commands";
  }

  function copy(text, button, done) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(function () { var old = button.textContent; button.textContent = done; setTimeout(function () { button.textContent = old; }, 1300); });
  }

  ids.forEach(function (id) {
    if (id === "method") return;
    $(id).addEventListener("input", update);
    $(id).addEventListener("change", update);
  });
  $("method").addEventListener("change", function () { renderMethodParameters(false); update(); });
  $("resetMethodParams").addEventListener("click", function () { renderMethodParameters(true); update(); });
  document.querySelectorAll(".preset").forEach(function (button) { button.addEventListener("click", function () { applyPreset(button.dataset.preset); }); });
  document.querySelectorAll(".tab").forEach(function (button) { button.addEventListener("click", function () {
    activeTab = button.dataset.tab;
    document.querySelectorAll(".tab").forEach(function (tab) { tab.classList.toggle("active", tab === button); tab.setAttribute("aria-selected", tab === button ? "true" : "false"); });
    $("yamlOutput").classList.toggle("hidden", activeTab !== "yaml");
    $("commandOutput").classList.toggle("hidden", activeTab !== "command");
    update();
  }); });
  $("copyOutput").addEventListener("click", function () { copy(activeTab === "yaml" ? $("yamlOutput").textContent : $("commandOutput").textContent, this, "Copied"); });
  $("copyLink").addEventListener("click", function () { copy(shareUrl(), this, "Link copied"); });
  $("downloadYaml").addEventListener("click", function () {
    var blob = new Blob([$("yamlOutput").textContent], {type:"text/yaml;charset=utf-8"});
    var link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "config.yaml"; link.click(); setTimeout(function () { URL.revokeObjectURL(link.href); }, 0);
  });
  $("theme").addEventListener("click", function () {
    var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("glnbench-theme", next); } catch (error) {}
  });
  try { var theme = localStorage.getItem("glnbench-theme"); if (theme === "dark" || theme === "light") document.documentElement.dataset.theme = theme; } catch (error) {}

  if (restoreFromUrl()) update(); else applyPreset("quick");
}());
